import { Theme } from '@radix-ui/themes';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  BASIC_FORM_DEFAULTS,
  NOISE_FORM_DEFAULTS,
  PREVIEW_DEFAULTS,
  useBasicFormStore,
  useGenerationProgressStore,
  useGenerationStatisticsStore,
  useNoiseFormStore,
  usePreviewStore,
  useWorldShapeFormStore,
  WORLD_SHAPE_FORM_DEFAULTS,
} from '../../stores';
import type * as WorldGenerationPipeline from '../../utils/map-generator';
import { MapRenderer, mapRepository } from '../../utils/map-renderer';

const { generateMock, disposeMock } = vi.hoisted(() => ({
  generateMock: vi.fn(),
  disposeMock: vi.fn(),
}));

vi.mock('../../utils/map-generator', async importOriginal => {
  const actual = await importOriginal<typeof WorldGenerationPipeline>();

  return {
    ...actual,
    PipelineWorkerClient: class {
      generate = generateMock;
      dispose = disposeMock;
    },
  };
});

import { WorldGenerator } from './world-generator';

const previewSize = 300;

describe('WorldGenerator', () => {
  beforeEach(() => {
    generateMock.mockReset();
    disposeMock.mockReset();
    mapRepository.clear();
    useBasicFormStore.setState({ ...BASIC_FORM_DEFAULTS });
    useWorldShapeFormStore.setState({ ...WORLD_SHAPE_FORM_DEFAULTS });
    useNoiseFormStore.setState({ ...NOISE_FORM_DEFAULTS });
    useGenerationProgressStore.getState().setProgress(undefined);
    useGenerationStatisticsStore.getState().setResult(undefined);
    usePreviewStore.setState({ ...PREVIEW_DEFAULTS });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      createImageData: () => ({ data: new Uint8ClampedArray(previewSize * previewSize * 4) }),
      putImageData: vi.fn(),
      clearRect: vi.fn(),
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
  });

  afterEach(() => {
    mapRepository.clear();
    useBasicFormStore.setState({ ...BASIC_FORM_DEFAULTS });
    useWorldShapeFormStore.setState({ ...WORLD_SHAPE_FORM_DEFAULTS });
    useNoiseFormStore.setState({ ...NOISE_FORM_DEFAULTS });
    useGenerationProgressStore.getState().setProgress(undefined);
    useGenerationStatisticsStore.getState().setResult(undefined);
    usePreviewStore.setState({ ...PREVIEW_DEFAULTS });
    vi.restoreAllMocks();
  });

  it('stops both generation and rendering when the application closes the preview', async () => {
    let rejectGeneration!: (error: Error) => void;
    generateMock.mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectGeneration = reject;
        })
    );
    disposeMock.mockImplementation(() => rejectGeneration(new Error('Worker disposed.')));
    const disposeRenderer = vi.spyOn(MapRenderer.prototype, 'dispose');
    const { unmount } = render(
      <Theme>
        <WorldGenerator />
      </Theme>
    );
    await userEvent.setup().click(screen.getByTestId('generate-map-button'));
    expect(generateMock).toHaveBeenCalledOnce();

    await act(async () => {
      unmount();
    });

    expect(disposeMock).toHaveBeenCalled();
    expect(disposeRenderer).toHaveBeenCalledOnce();
    expect(mapRepository.get()).toBeUndefined();
  });

  it('reports when pipeline maps are missing', async () => {
    const user = userEvent.setup();

    generateMock.mockRejectedValue(new Error('Pipeline completed without all required map data.'));

    render(
      <Theme>
        <WorldGenerator />
      </Theme>
    );

    await user.click(screen.getByTestId('generate-map-button'));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Pipeline completed without all required map data.'
    );
  });

  it('reports when canvas context is unavailable', async () => {
    const user = userEvent.setup();

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    generateMock.mockImplementation((config, options) => {
      const count = config.world.width * config.world.height;
      options.onEvent({
        type: 'stage-completed',
        stageId: 'world-shape',
        stageName: 'World shape',
        stageIndex: 0,
        stageCount: 2,
        statistics: {},
        data: { worldMask: new Uint8Array(count).fill(1) },
      });
      options.onEvent({
        type: 'stage-completed',
        stageId: 'noise',
        stageName: 'Noise',
        stageIndex: 1,
        stageCount: 2,
        statistics: {},
        data: { noiseMap: new Float32Array(count).fill(0.5) },
      });
      return Promise.resolve({
        statistics: [],
        totalDurationMs: 1,
      });
    });

    render(
      <Theme>
        <WorldGenerator />
      </Theme>
    );

    await user.click(screen.getByTestId('generate-map-button'));

    expect(await screen.findByRole('alert')).toHaveTextContent('Canvas is not available.');
    expect(useGenerationProgressStore.getState().progress?.status).toBe('completed');
  });

  it('keeps the stored progress after the preview is remounted', async () => {
    useGenerationProgressStore.getState().setProgress({
      status: 'completed',
      totalDurationMs: 3,
      stages: [
        {
          id: 'world-shape',
          name: 'World shape generation',
          status: 'completed',
          percentage: 100,
          durationMs: 1,
        },
        {
          id: 'noise',
          name: 'Noise generation',
          status: 'completed',
          percentage: 100,
          durationMs: 2,
        },
      ],
    });

    const { unmount } = render(
      <Theme>
        <WorldGenerator />
      </Theme>
    );
    expect(screen.getByText('Complete')).toBeInTheDocument();

    await act(async () => {
      unmount();
    });
    render(
      <Theme>
        <WorldGenerator />
      </Theme>
    );

    expect(screen.getByText('Complete')).toBeInTheDocument();
  });
});
