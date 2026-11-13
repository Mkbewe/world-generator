import { Theme } from '@radix-ui/themes';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { worldGenerationSession } from './lib/world-generation-session';
import {
  BASE_CLIMATE_FORM_DEFAULTS,
  baseClimateConfigOf,
  GENERAL_FORM_DEFAULTS,
  MACRO_REGION_FORM_DEFAULTS,
  PREVIEW_DEFAULTS,
  useBaseClimateFormStore,
  useGeneralFormStore,
  useGenerationProgressStore,
  useGenerationStatisticsStore,
  useMacroRegionFormStore,
  usePreviewStore,
  useWorldShapeFormStore,
  WORLD_SHAPE_FORM_DEFAULTS,
} from '../../stores';
import type * as WorldGenerationPipeline from '../../utils/map-generator';
import type { GenerationEvent, MapConfig, StageInfo } from '../../utils/map-generator';
import { MapRenderer, mapRepository } from '../../utils/map-renderer';
import { HeaderActionsProvider, useHeaderActions } from '../header';

const { runGenerationMock } = vi.hoisted(() => ({
  runGenerationMock: vi.fn(),
}));

vi.mock('../../utils/map-generator', async importOriginal => {
  const actual = await importOriginal<typeof WorldGenerationPipeline>();

  return {
    ...actual,
    runGeneration: runGenerationMock,
  };
});

import { WorldGenerator } from './world-generator';

const previewSize = 300;

function completed(stageId: string, data: Record<string, unknown>): GenerationEvent {
  return {
    type: 'stage-completed',
    stageId,
    stageNameKey: 'stages.worldShape',
    stageIndex: 0,
    stageCount: 1,
    statistics: {
      stageId,
      stageNameKey: 'stages.worldShape',
      status: 'completed',
      startedAt: 0,
      finishedAt: 1,
      durationMs: 1,
    },
    data,
  };
}

/** A run that stays pending until its signal aborts, like the real worker. */
function pendingRun(options?: { signal?: AbortSignal }): Promise<never> {
  return new Promise((_, reject) => {
    options?.signal?.addEventListener('abort', () => reject(new Error('Generation cancelled.')));
  });
}

function FullscreenBridge() {
  const { setIsFullscreen } = useHeaderActions();

  return (
    <button type='button' onClick={() => setIsFullscreen(true)}>
      Enter fullscreen
    </button>
  );
}

function renderWorldGenerator() {
  return render(
    <Theme>
      <HeaderActionsProvider>
        <WorldGenerator />
      </HeaderActionsProvider>
    </Theme>
  );
}

describe('WorldGenerator', () => {
  beforeEach(() => {
    runGenerationMock.mockReset();
    worldGenerationSession.reset();
    mapRepository.clear();
    useGeneralFormStore.setState({ ...GENERAL_FORM_DEFAULTS });
    useWorldShapeFormStore.setState({ ...WORLD_SHAPE_FORM_DEFAULTS });
    useMacroRegionFormStore.setState({ ...MACRO_REGION_FORM_DEFAULTS });
    useBaseClimateFormStore.setState({ ...BASE_CLIMATE_FORM_DEFAULTS });
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

  afterEach(async () => {
    worldGenerationSession.cancel();
    worldGenerationSession.detach();
    await act(async () => {
      mapRepository.clear();
      useGeneralFormStore.setState({ ...GENERAL_FORM_DEFAULTS });
      useWorldShapeFormStore.setState({ ...WORLD_SHAPE_FORM_DEFAULTS });
      useMacroRegionFormStore.setState({ ...MACRO_REGION_FORM_DEFAULTS });
      useBaseClimateFormStore.setState({ ...BASE_CLIMATE_FORM_DEFAULTS });
      useGenerationProgressStore.getState().setProgress(undefined);
      useGenerationStatisticsStore.getState().setResult(undefined);
      usePreviewStore.setState({ ...PREVIEW_DEFAULTS });
    });
    vi.restoreAllMocks();
  });

  it('keeps generation running when the preview unmounts and replays it on return', async () => {
    let runSignal: AbortSignal | undefined;
    let runConfig: MapConfig | undefined;
    let onStages: ((stages: readonly StageInfo[]) => void) | undefined;
    let onEvent: ((event: GenerationEvent) => void) | undefined;
    runGenerationMock.mockImplementation((config, options) => {
      runConfig = config;
      runSignal = options?.signal;
      onStages = options?.onStages;
      onEvent = options?.onEvent;
      return pendingRun(options);
    });
    const disposeRenderer = vi.spyOn(MapRenderer.prototype, 'dispose');
    const { unmount } = renderWorldGenerator();
    await userEvent.setup().click(screen.getByTestId('generate-map-button'));
    expect(runGenerationMock).toHaveBeenCalledOnce();

    await act(async () => {
      unmount();
    });

    expect(runSignal?.aborted).toBe(false);
    expect(disposeRenderer).toHaveBeenCalledOnce();

    const add = vi.spyOn(MapRenderer.prototype, 'add');
    renderWorldGenerator();
    const config = runConfig;
    if (!config) {
      throw new Error('Expected the run configuration.');
    }
    expect(config.baseClimate).toEqual(baseClimateConfigOf(useBaseClimateFormStore.getState()));
    const cells = config.world.dimensions.sampleWidth * config.world.dimensions.sampleHeight;
    await act(async () => {
      onStages?.([{ id: 'world-shape', nameKey: 'stages.worldShape' }]);
      onEvent?.(completed('world-shape', { worldMask: new Uint8Array(cells).fill(1) }));
    });

    expect(add).toHaveBeenCalledWith('world-shape', expect.any(Uint8Array));
    expect(mapRepository.get()).toBeUndefined();
  });

  it('reports when pipeline maps are missing', async () => {
    const user = userEvent.setup();

    runGenerationMock.mockRejectedValue(
      new Error('Pipeline completed without all required map data.')
    );

    renderWorldGenerator();

    await user.click(screen.getByTestId('generate-map-button'));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Pipeline completed without all required map data.'
    );
  });

  it('reports when canvas context is unavailable', async () => {
    const user = userEvent.setup();

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    runGenerationMock.mockImplementation((config, options) => {
      const count = config.world.dimensions.sampleWidth * config.world.dimensions.sampleHeight;
      options.onStages([
        { id: 'world-shape', nameKey: 'stages.worldShape' },
        { id: 'macro-region', nameKey: 'stages.macroRegion' },
      ]);
      options.onEvent({
        type: 'stage-completed',
        stageId: 'world-shape',
        stagenameKey: 'stages.worldShape',
        stageIndex: 0,
        stageCount: 2,
        statistics: {},
        data: { worldMask: new Uint8Array(count).fill(1) },
      });
      options.onEvent({
        type: 'stage-completed',
        stageId: 'macro-region',
        stagenameKey: 'stages.macroRegion',
        stageIndex: 1,
        stageCount: 2,
        statistics: {},
        data: { macroRegionIdMap: new Uint8Array(count) },
      });
      return Promise.resolve({
        statistics: [],
        totalDurationMs: 1,
      });
    });

    renderWorldGenerator();

    await user.click(screen.getByTestId('generate-map-button'));
    await act(async () => {});

    expect(await screen.findByRole('alert')).toHaveTextContent('Canvas is not available.');
    expect(useGenerationProgressStore.getState().progress?.status).toBe('completed');
  });

  it('resets the previous progress when a new run starts', async () => {
    useGenerationProgressStore.getState().setProgress({
      status: 'completed',
      totalDurationMs: 3,
      stages: [
        {
          id: 'world-shape',
          nameKey: 'stages.worldShape',
          status: 'completed',
          percentage: 100,
        },
        { id: 'macro-region', nameKey: 'stages.macroRegion', status: 'completed', percentage: 100 },
      ],
    });
    runGenerationMock.mockImplementation((_config, options) => {
      options?.onStages?.([
        { id: 'world-shape', nameKey: 'stages.worldShape' },
        { id: 'macro-region', nameKey: 'stages.macroRegion' },
      ]);
      return pendingRun(options);
    });

    renderWorldGenerator();
    await userEvent.setup().click(screen.getByTestId('generate-map-button'));
    await act(async () => {});

    expect(useGenerationProgressStore.getState().progress).toEqual({
      status: 'running',
      startedAt: expect.any(Number),
      stages: [
        { id: 'world-shape', nameKey: 'stages.worldShape', status: 'pending', percentage: 0 },
        { id: 'macro-region', nameKey: 'stages.macroRegion', status: 'pending', percentage: 0 },
      ],
    });
    expect(screen.getByText('Generating')).toBeInTheDocument();
  });

  it('keeps the stored progress after the preview is remounted', async () => {
    useGenerationProgressStore.getState().setProgress({
      status: 'completed',
      totalDurationMs: 3,
      stages: [
        {
          id: 'world-shape',
          nameKey: 'stages.worldShape',
          status: 'completed',
          percentage: 100,
          durationMs: 1,
        },
        {
          id: 'macro-region',
          nameKey: 'stages.macroRegion',
          status: 'completed',
          percentage: 100,
          durationMs: 2,
        },
      ],
    });

    const { unmount } = renderWorldGenerator();
    expect(screen.getByText('Complete')).toBeInTheDocument();

    await act(async () => {
      unmount();
    });
    renderWorldGenerator();

    expect(screen.getByText('Complete')).toBeInTheDocument();
  });

  it('removes the settings column from the tab order while fullscreen is open', async () => {
    const user = userEvent.setup();
    render(
      <Theme>
        <HeaderActionsProvider>
          <FullscreenBridge />
          <WorldGenerator />
        </HeaderActionsProvider>
      </Theme>
    );

    expect(screen.getByText('Map Settings').closest('[inert]')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Enter fullscreen' }));

    expect(screen.getByText('Map Settings').closest('[inert]')).not.toBeNull();
  });
});
