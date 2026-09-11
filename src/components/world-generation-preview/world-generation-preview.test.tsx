import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type * as WorldGenerationPipeline from '../../utils/map-generator';

const { generateMock } = vi.hoisted(() => ({
  generateMock: vi.fn(),
}));

vi.mock('../../utils/map-generator', async importOriginal => {
  const actual = await importOriginal<typeof WorldGenerationPipeline>();

  return {
    ...actual,
    PipelineWorkerClient: class {
      generate = generateMock;
      dispose = vi.fn();
    },
  };
});

import { WorldGenerationPreview } from './world-generation-preview';

const previewSize = 300;

describe('WorldGenerationPreview', () => {
  beforeEach(() => {
    generateMock.mockReset();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      createImageData: () => ({ data: new Uint8ClampedArray(previewSize * previewSize * 4) }),
      putImageData: vi.fn(),
      clearRect: vi.fn(),
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
      'Pipeline completed without all required map layers.'
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
      return Promise.resolve({ statistics: [], totalDurationMs: 1 });
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
