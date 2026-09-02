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
