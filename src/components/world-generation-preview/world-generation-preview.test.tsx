import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type * as WorldGenerationPipeline from '../../utils/map-generator';
import type { GenerationEvent, StageStatistics } from '../../utils/map-generator';

const { generateMock } = vi.hoisted(() => ({
  generateMock: vi.fn(),
}));

vi.mock('../../utils/map-generator', async importOriginal => {
  const actual = await importOriginal<typeof WorldGenerationPipeline>();

  return {
    ...actual,
    createMapGenerator: () => ({
      generate: generateMock,
      stages: actual.createMapGenerator().stages,
    }),
    PipelineWorkerClient: class {
      generate = generateMock;
      dispose = vi.fn();
    },
  };
});

import { WorldGenerationPreview } from './world-generation-preview';

const previewSize = 300;

function createStatistics(stageId: string, stageName: string): StageStatistics {
  return {
    stageId,
    stageName,
    status: 'completed',
    startedAt: 0,
    finishedAt: 12.5,
    durationMs: 12.5,
  };
}

function createStageCompletedEvent(stageId: string, stageName: string): GenerationEvent {
  return {
    type: 'stage-completed',
    stageId,
    stageName,
    stageIndex: 0,
    stageCount: 2,
    statistics: createStatistics(stageId, stageName),
  };
}

describe('WorldGenerationPreview', () => {
  beforeEach(() => {
    generateMock.mockReset();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      createImageData: () => ({ data: new Uint8ClampedArray(previewSize * previewSize * 4) }),
      putImageData: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps the statistics table mounted before and during generation', async () => {
    const user = userEvent.setup();

    generateMock.mockImplementation(() => new Promise(() => {}));

    render(
      <Theme>
        <WorldGenerationPreview />
      </Theme>
    );

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('World shape generation')).toBeInTheDocument();
    expect(screen.getByText('Noise generation')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();

    await user.click(screen.getByTestId('generate-map-button'));

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('World shape generation')).toBeInTheDocument();
    expect(screen.getByText('Noise generation')).toBeInTheDocument();
    expect(screen.queryByText(/Range/)).not.toBeInTheDocument();
  });

  it('renders incremental stage progress before generation finishes', async () => {
    const user = userEvent.setup();
    let resolveGeneration: (result: {
      worldMask: Uint8Array;
      noiseMap: Float32Array;
      statistics: StageStatistics[];
      totalDurationMs: number;
    }) => void = () => {};

    generateMock.mockImplementation(
      (_config: unknown, options: { onEvent?: (event: GenerationEvent) => void } = {}) => {
        options.onEvent?.(createStageCompletedEvent('world-shape', 'World shape generation'));
        options.onEvent?.(createStageCompletedEvent('noise', 'Noise generation'));

        return new Promise(resolve => {
          resolveGeneration = resolve;
        });
      }
    );

    render(
      <Theme>
        <WorldGenerationPreview />
      </Theme>
    );

    await user.click(screen.getByTestId('generate-map-button'));

    expect(screen.getByText('World shape generation')).toBeInTheDocument();
    expect(screen.getByText('Noise generation')).toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(4);
    expect(screen.queryByText(/Range/)).not.toBeInTheDocument();

    const statistics = [
      createStatistics('world-shape', 'World shape generation'),
      createStatistics('noise', 'Noise generation'),
    ];

    resolveGeneration({
      worldMask: new Uint8Array(previewSize * previewSize).fill(1),
      noiseMap: new Float32Array(previewSize * previewSize).fill(0.5),
      statistics,
      totalDurationMs: 20.4,
    });

    expect(await screen.findByText('20.4 ms')).toBeInTheDocument();
    expect(screen.getByText('Range 0.500–0.500')).toBeInTheDocument();
  });

  it('keeps previous statistics visible until the next generation finishes', async () => {
    const user = userEvent.setup();
    let resolveGeneration: (result: {
      worldMask: Uint8Array;
      noiseMap: Float32Array;
      statistics: StageStatistics[];
      totalDurationMs: number;
    }) => void = () => {};

    const completedResult = {
      worldMask: new Uint8Array(previewSize * previewSize).fill(1),
      noiseMap: new Float32Array(previewSize * previewSize).fill(0.5),
      statistics: [
        createStatistics('world-shape', 'World shape generation'),
        createStatistics('noise', 'Noise generation'),
      ],
      totalDurationMs: 20.4,
    };

    generateMock.mockResolvedValueOnce(completedResult).mockImplementation(
      () =>
        new Promise(resolve => {
          resolveGeneration = resolve;
        })
    );

    render(
      <Theme>
        <WorldGenerationPreview />
      </Theme>
    );

    await user.click(screen.getByTestId('generate-map-button'));

    expect(await screen.findByText('20.4 ms')).toBeInTheDocument();
    expect(screen.getByText('Range 0.500–0.500')).toBeInTheDocument();

    await user.click(screen.getByTestId('generate-map-button'));

    expect(screen.getByText('20.4 ms')).toBeInTheDocument();
    expect(screen.getByText('Range 0.500–0.500')).toBeInTheDocument();

    resolveGeneration({
      ...completedResult,
      totalDurationMs: 31.2,
      noiseMap: new Float32Array(previewSize * previewSize).fill(0.25),
    });

    expect(await screen.findByText('31.2 ms')).toBeInTheDocument();
    expect(screen.getByText('Range 0.250–0.250')).toBeInTheDocument();
  });

  it('reports when pipeline maps are missing', async () => {
    const user = userEvent.setup();

    generateMock.mockResolvedValue({
      statistics: [],
      totalDurationMs: 1,
    });

    render(
      <Theme>
        <WorldGenerationPreview />
      </Theme>
    );

    await user.click(screen.getByTestId('generate-map-button'));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Pipeline completed without world mask or noise map.'
    );
  });

  it('reports when canvas context is unavailable', async () => {
    const user = userEvent.setup();

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    generateMock.mockResolvedValue({
      worldMask: new Uint8Array(previewSize * previewSize).fill(1),
      noiseMap: new Float32Array(previewSize * previewSize).fill(0.5),
      statistics: [],
      totalDurationMs: 1,
    });

    render(
      <Theme>
        <WorldGenerationPreview />
      </Theme>
    );

    await user.click(screen.getByTestId('generate-map-button'));

    expect(await screen.findByRole('alert')).toHaveTextContent('Canvas is not available.');
  });
});
