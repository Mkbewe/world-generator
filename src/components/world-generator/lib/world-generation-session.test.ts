import { WorldGenerationSession } from './world-generation-session';
import { PREVIEW_DEFAULTS, usePreviewStore } from '../../../stores';
import {
  type GenerationEvent,
  type MapConfig,
  type PipelineWorkerGenerationResult,
  type RunGeneration,
  type StageInfo,
} from '../../../utils/map-generator';
import { DEFAULT_MACRO_REGIONS } from '../../../utils/map-generator/stages/macro-region-defaults';
import { MapRenderer, mapRepository } from '../../../utils/map-renderer';
import { MapLayer } from '../../../utils/map-renderer/layer';
import { Viewport } from '../../../utils/map-renderer/viewport';

const config: MapConfig = {
  world: {
    dimensions: { widthMeters: 2, heightMeters: 2, sampleWidth: 2, sampleHeight: 2 },
    seed: 17,
    shape: 'disc',
  },
  noise: { frequency: 4, octaves: 4, persistence: 0.5, lacunarity: 2 },
};

const stages: readonly StageInfo[] = [
  { id: 'world-shape', name: 'World shape generation' },
  { id: 'noise', name: 'Noise generation' },
];

function completed(stageId: string, data: Record<string, unknown>): GenerationEvent {
  return {
    type: 'stage-completed',
    stageId,
    stageName: stageId,
    stageIndex: stageId === 'world-shape' ? 0 : 1,
    stageCount: 2,
    statistics: {
      stageId,
      stageName: stageId,
      status: 'completed',
      startedAt: 0,
      finishedAt: 1,
      durationMs: 1,
    },
    data,
  };
}

function skipped(stageId: string): GenerationEvent {
  return {
    type: 'stage-skipped',
    stageId,
    stageName: stageId,
    stageIndex: stageId === 'world-shape' ? 0 : 1,
    stageCount: 3,
    statistics: {
      stageId,
      stageName: stageId,
      status: 'skipped',
      startedAt: 0,
      finishedAt: 0,
      durationMs: 0,
    },
  };
}

describe('WorldGenerationSession', () => {
  let renderer: MapRenderer;
  let runner: ReturnType<typeof vi.fn<RunGeneration>>;
  let session: WorldGenerationSession;

  beforeEach(() => {
    mapRepository.clear();
    usePreviewStore.setState({ ...PREVIEW_DEFAULTS });
    vi.spyOn(Viewport.prototype, 'start').mockImplementation(() => {});
    vi.spyOn(Viewport.prototype, 'measure').mockReturnValue(undefined);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      createImageData: (width: number, height: number) => ({
        data: new Uint8ClampedArray(width * height * 4),
      }),
      putImageData: vi.fn(),
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      ellipse: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(MapLayer.prototype, 'prepare').mockResolvedValue();
    renderer = new MapRenderer(
      {
        canvas: document.createElement('canvas'),
        overlayCanvas: document.createElement('canvas'),
        viewportElement: document.createElement('div'),
      },
      vi.fn()
    );
    runner = vi.fn<RunGeneration>();
    session = new WorldGenerationSession(runner);
  });

  afterEach(() => {
    session.cancel();
    session.detach();
    renderer.dispose();
    mapRepository.clear();
    vi.restoreAllMocks();
  });

  it('maps registered stage data and saves map metadata after generation', async () => {
    session.attach(renderer);
    const mask = new Uint8Array(4).fill(1);
    const noise = new Float32Array(4);
    const result: PipelineWorkerGenerationResult = {
      statistics: [],
      totalDurationMs: 2,
    };
    runner.mockImplementation(async (_, options) => {
      options?.onStages?.(stages);
      options?.onEvent?.({
        type: 'stage-started',
        stageId: 'world-shape',
        stageName: 'World shape',
        stageIndex: 0,
        stageCount: 2,
      });
      options?.onEvent?.(completed('world-shape', { worldMask: mask }));
      options?.onEvent?.(completed('statistics-only', { unknown: noise }));
      options?.onEvent?.(completed('noise', { noiseMap: noise }));
      return result;
    });

    const onProgress = vi.fn();
    await expect(session.generate(config, onProgress)).resolves.toEqual({
      statistics: result.statistics,
      totalDurationMs: result.totalDurationMs,
    });
    await renderer.ready;

    expect(runner).toHaveBeenCalledOnce();
    expect(mapRepository.get()).toMatchObject({
      width: 2,
      height: 2,
      seed: '17',
      shape: 'disc',
      regionGeometry: { seed: 17, deformation: { source: 'dedicated' } },
    });
    expect(mapRepository.get()?.layers.worldMask).toBe(mask);
    expect(mapRepository.get()?.layers.noiseMap).toBe(noise);
    expect(renderer.state.displayedLayer).toBe('noise');
    expect(onProgress.mock.lastCall?.[0].status).toBe('completed');
  });

  it('recomputes only the stages affected by the configuration change', async () => {
    runner.mockResolvedValue({ statistics: [], totalDurationMs: 1 });
    const withRegions = { ...config, macroRegions: DEFAULT_MACRO_REGIONS };

    await session.generate(config, vi.fn());
    expect(session.dirtyStageIds).toEqual(['world-shape', 'noise', 'macro-region']);

    await session.generate(withRegions, vi.fn());
    expect(session.dirtyStageIds).toEqual(['macro-region']);

    await session.generate(withRegions, vi.fn());
    expect(session.dirtyStageIds).toEqual([]);
  });

  it('reuses the saved rasters for the clean stages', async () => {
    const mask = new Uint8Array(4).fill(1);
    const noise = new Float32Array(4);
    const regions = new Uint8Array(4);
    let run = 0;
    runner.mockImplementation(async (_, options) => {
      run += 1;
      options?.onStages?.(stages);
      if (run === 1) {
        options?.onEvent?.(completed('world-shape', { worldMask: mask }));
        options?.onEvent?.(completed('noise', { noiseMap: noise }));
      } else {
        options?.onEvent?.(skipped('world-shape'));
        options?.onEvent?.(skipped('noise'));
      }
      options?.onEvent?.(completed('macro-region', { macroRegionIdMap: regions }));
      return { statistics: [], totalDurationMs: 1 };
    });
    session.attach(renderer);

    await session.generate(config, vi.fn());
    await session.generate({ ...config, macroRegions: DEFAULT_MACRO_REGIONS }, vi.fn());
    await renderer.ready;

    expect(runner.mock.lastCall?.[1]?.reuse).toEqual({
      dirtyStageIds: ['macro-region'],
      cachedRasters: { worldMask: mask, noiseMap: noise, macroRegionIdMap: regions },
    });
    expect(mapRepository.get()?.layers).toMatchObject({ worldMask: mask, noiseMap: noise });
    expect(renderer.state.displayedLayer).toBe('macro-region');
  });

  it('keeps the previous map visible and prepares only the new layers', async () => {
    const mask = new Uint8Array(4).fill(1);
    const noise = new Float32Array(4);
    const regions = new Uint8Array(4);
    runner.mockImplementation(async (_, options) => {
      options?.onStages?.(stages);
      options?.onEvent?.(completed('world-shape', { worldMask: mask }));
      options?.onEvent?.(completed('noise', { noiseMap: noise }));
      options?.onEvent?.(completed('macro-region', { macroRegionIdMap: regions }));
      return { statistics: [], totalDurationMs: 1 };
    });
    session.attach(renderer);
    await session.generate(config, vi.fn());
    await renderer.ready;
    expect(renderer.state.displayedLayer).toBe('macro-region');

    const prepare = vi.mocked(MapLayer.prototype.prepare);
    prepare.mockClear();
    let finish!: (result: PipelineWorkerGenerationResult) => void;
    runner.mockImplementation((_, options) => {
      options?.onStages?.(stages);
      options?.onEvent?.(skipped('world-shape'));
      options?.onEvent?.(skipped('noise'));
      options?.onEvent?.(completed('macro-region', { macroRegionIdMap: new Uint8Array(4) }));
      return new Promise(resolve => {
        finish = resolve;
      });
    });
    const run = session.generate({ ...config, macroRegions: DEFAULT_MACRO_REGIONS }, vi.fn());

    expect(renderer.state.displayedLayer).toBe('macro-region');
    expect(renderer.state.fitted).toBe(true);

    finish({ statistics: [], totalDurationMs: 1 });
    await run;
    await renderer.ready;

    expect(prepare).toHaveBeenCalledTimes(1);
    expect(renderer.state.displayedLayer).toBe('macro-region');
  });

  it('drops the baseline when a failed run left no saved map to reuse', async () => {
    runner.mockResolvedValue({ statistics: [], totalDurationMs: 1 });
    await session.generate(config, vi.fn());

    const changed = { ...config, noise: { ...config.noise, frequency: 5 } };
    runner.mockRejectedValue(new Error('generation failed'));
    await expect(session.generate(changed, vi.fn())).rejects.toThrow('generation failed');

    runner.mockResolvedValue({ statistics: [], totalDurationMs: 1 });
    await session.generate(changed, vi.fn());
    expect(session.dirtyStageIds).toEqual(['world-shape', 'noise', 'macro-region']);
  });

  it('rejects missing stage data without saving an incomplete map', async () => {
    session.attach(renderer);
    runner.mockImplementation(async (_, options) => {
      options?.onStages?.(stages);
      options?.onEvent?.(completed('world-shape', { worldMask: 'nope' }));
      return {
        statistics: [],
        totalDurationMs: 1,
      };
    });

    await expect(session.generate(config, vi.fn())).rejects.toThrow('Invalid world mask.');
    expect(mapRepository.get()).toBeUndefined();
  });

  it('registers the region layer produced by the macro-region stage', async () => {
    session.attach(renderer);
    const regionIds = new Uint8Array(4);
    runner.mockImplementation(async (_, options) => {
      options?.onStages?.(stages);
      options?.onEvent?.(completed('world-shape', { worldMask: new Uint8Array(4).fill(1) }));
      options?.onEvent?.(completed('macro-region', { macroRegionIdMap: regionIds }));
      return {
        statistics: [],
        totalDurationMs: 1,
      };
    });

    await expect(session.generate(config, vi.fn())).resolves.toMatchObject({ totalDurationMs: 1 });
    await renderer.ready;

    expect(renderer.state.layers.find(layer => layer.id === 'macro-region')?.available).toBe(true);
    expect(mapRepository.get()?.layers.macroRegionIdMap).toBe(regionIds);
  });

  it('captures macro region labels with the snapshot', async () => {
    session.attach(renderer);
    runner.mockImplementation(async (_, options) => {
      options?.onStages?.(stages);
      options?.onEvent?.(completed('world-shape', { worldMask: new Uint8Array(4).fill(1) }));
      return {
        statistics: [],
        totalDurationMs: 1,
      };
    });

    await session.generate({ ...config, macroRegions: DEFAULT_MACRO_REGIONS }, vi.fn());

    expect(mapRepository.get()?.info).toEqual({
      macroRegionLabels: DEFAULT_MACRO_REGIONS.map(region => region.label),
      worldDimensions: { widthMeters: 2, heightMeters: 2, sampleWidth: 2, sampleHeight: 2 },
    });
  });

  it('saves generated stage data even when the renderer stops', async () => {
    session.attach(renderer);
    const mask = new Uint8Array(4).fill(1);
    const noise = new Float32Array(4);
    const add = vi.spyOn(renderer, 'add');
    runner.mockImplementation(async (_, options) => {
      options?.onStages?.(stages);
      renderer.cancel();
      options?.onEvent?.(completed('world-shape', { worldMask: mask }));
      options?.onEvent?.(completed('noise', { noiseMap: noise }));
      return {
        statistics: [],
        totalDurationMs: 1,
      };
    });

    await expect(session.generate(config, vi.fn())).resolves.toMatchObject({ totalDurationMs: 1 });

    expect(add).not.toHaveBeenCalled();
    expect(mapRepository.get()?.layers.worldMask).toBe(mask);
    expect(mapRepository.get()?.layers.noiseMap).toBe(noise);
  });

  it('does not save when the generator rejects its incomplete result', async () => {
    session.attach(renderer);
    runner.mockRejectedValue(new Error('Pipeline completed without all required map data.'));

    await expect(session.generate(config, vi.fn())).rejects.toThrow('required map data');
    expect(mapRepository.get()).toBeUndefined();
  });

  it('cancels generation while allowing queued rendering to finish', async () => {
    session.attach(renderer);
    let onStages: ((stages: readonly StageInfo[]) => void) | undefined;
    let onEvent: ((event: GenerationEvent) => void) | undefined;
    let signal: AbortSignal | undefined;
    let finish!: (result: PipelineWorkerGenerationResult) => void;
    runner.mockImplementation((_, options) => {
      onStages = options?.onStages;
      onEvent = options?.onEvent;
      signal = options?.signal;
      return new Promise(resolve => {
        finish = resolve;
      });
    });
    const generation = session.generate(config, vi.fn());
    const cancelled = expect(generation).resolves.toBeUndefined();
    let finishDrawing!: () => void;
    vi.spyOn(MapLayer.prototype, 'prepare').mockReturnValue(
      new Promise(resolve => {
        finishDrawing = resolve;
      })
    );
    onStages?.(stages);
    onEvent?.(completed('world-shape', { worldMask: new Uint8Array(4) }));
    const renderSignal = renderer.signal;
    session.cancel();
    expect(signal?.aborted).toBe(true);
    expect(renderSignal.aborted).toBe(false);
    expect(() => onEvent?.(completed('world-shape', { worldMask: new Uint8Array(4) }))).toThrow();
    finish({
      statistics: [],
      totalDurationMs: 1,
    });
    await cancelled;
    expect(mapRepository.get()).toBeUndefined();
    finishDrawing();
    await renderer.ready;
    expect(renderer.state.displayedLayer).toBe('world-shape');
  });

  it.each(['cancel', 'reset', 'dispose'] as const)(
    'keeps generating after the renderer %s and stops sending data to it',
    async action => {
      session.attach(renderer);
      let onStages: ((stages: readonly StageInfo[]) => void) | undefined;
      let onEvent: ((event: GenerationEvent) => void) | undefined;
      let finish!: (result: PipelineWorkerGenerationResult) => void;
      runner.mockImplementation((_, options) => {
        onStages = options?.onStages;
        onEvent = options?.onEvent;
        return new Promise(resolve => {
          finish = resolve;
        });
      });
      const onProgress = vi.fn();
      const generation = session.generate(config, onProgress);
      const add = vi.spyOn(renderer, 'add');

      renderer[action]();

      onStages?.(stages);
      const mask = new Uint8Array(4);
      const noise = new Float32Array(4);
      expect(() => onEvent?.(completed('world-shape', { worldMask: mask }))).not.toThrow();
      expect(() => onEvent?.(completed('noise', { noiseMap: noise }))).not.toThrow();
      expect(add).not.toHaveBeenCalled();
      finish({ statistics: [], totalDurationMs: 1 });
      await expect(generation).resolves.toMatchObject({ totalDurationMs: 1 });
      expect(mapRepository.get()?.layers.worldMask).toBe(mask);
      expect(mapRepository.get()?.layers.noiseMap).toBe(noise);
      expect(onProgress.mock.lastCall?.[0].status).toBe('completed');
    }
  );

  it('keeps generating while detached and replays collected layers on attach', async () => {
    let onStages: ((stages: readonly StageInfo[]) => void) | undefined;
    let onEvent: ((event: GenerationEvent) => void) | undefined;
    let finish!: (result: PipelineWorkerGenerationResult) => void;
    runner.mockImplementation((_, options) => {
      onStages = options?.onStages;
      onEvent = options?.onEvent;
      return new Promise(resolve => {
        finish = resolve;
      });
    });
    const mask = new Uint8Array(4).fill(1);
    const noise = new Float32Array(4);
    const generation = session.generate(config, vi.fn());

    onStages?.(stages);
    onEvent?.(completed('world-shape', { worldMask: mask }));
    onEvent?.(completed('noise', { noiseMap: noise }));
    expect(usePreviewStore.getState().baseLayer).toBe('noise');

    session.attach(renderer);
    await renderer.ready;
    expect(renderer.state.displayedLayer).toBe('noise');
    expect(renderer.state.layers.find(layer => layer.id === 'world-shape')?.available).toBe(true);

    onEvent?.(completed('macro-region', { macroRegionIdMap: new Uint8Array(4) }));
    await renderer.ready;
    expect(renderer.state.displayedLayer).toBe('macro-region');

    finish({ statistics: [], totalDurationMs: 1 });
    await expect(generation).resolves.toMatchObject({ totalDurationMs: 1 });
    expect(mapRepository.get()?.layers.worldMask).toBe(mask);
    expect(mapRepository.get()?.layers.noiseMap).toBe(noise);
  });

  it('follows the last generated layer with the preview selection', async () => {
    session.attach(renderer);
    runner.mockImplementation(async (_, options) => {
      options?.onStages?.(stages);
      options?.onEvent?.(completed('world-shape', { worldMask: new Uint8Array(4).fill(1) }));
      options?.onEvent?.(completed('noise', { noiseMap: new Float32Array(4) }));
      return {
        statistics: [],
        totalDurationMs: 1,
      };
    });

    await session.generate(config, vi.fn());

    expect(usePreviewStore.getState().baseLayer).toBe('noise');
  });

  it('restores the saved snapshot when a renderer attaches after the run', async () => {
    const mask = new Uint8Array(4).fill(1);
    const noise = new Float32Array(4);
    const snapshot = {
      width: 2,
      height: 2,
      seed: '17',
      shape: 'disc' as const,
      layers: { worldMask: mask, noiseMap: noise },
    };
    mapRepository.save(snapshot);

    session.attach(renderer);
    await renderer.ready;

    expect(renderer.state.displayedLayer).toBe('noise');
    expect(renderer.state.layers.find(layer => layer.id === 'noise')?.available).toBe(true);
    expect(mapRepository.get()).toBe(snapshot);
  });

  it('starts a new run itself and prevents the previous run from overwriting its result', async () => {
    session.attach(renderer);
    let finishFirst!: (result: PipelineWorkerGenerationResult) => void;
    let firstEvent: ((event: GenerationEvent) => void) | undefined;
    let firstSignal: AbortSignal | undefined;
    const mask = new Uint8Array(4).fill(1);
    const noise = new Float32Array(4);
    runner
      .mockImplementationOnce((_, options) => {
        firstEvent = options?.onEvent;
        firstSignal = options?.signal;
        return new Promise(resolve => {
          finishFirst = resolve;
        });
      })
      .mockImplementationOnce(async (_, options) => {
        options?.onStages?.(stages);
        options?.onEvent?.(completed('world-shape', { worldMask: mask }));
        options?.onEvent?.(completed('noise', { noiseMap: noise }));
        return {
          statistics: [],
          totalDurationMs: 2,
        };
      });

    const first = session.generate(config, vi.fn());
    const renderSignal = renderer.signal;
    const second = session.generate({ ...config, world: { ...config.world, seed: 99 } }, vi.fn());
    expect(renderSignal.aborted).toBe(true);
    expect(firstSignal?.aborted).toBe(true);
    expect(() => firstEvent?.(completed('world-shape', { worldMask: mask }))).toThrow();
    await expect(second).resolves.toMatchObject({ totalDurationMs: 2 });
    const saved = mapRepository.get();
    expect(saved?.seed).toBe('99');
    expect(saved?.layers.worldMask).toBe(mask);
    expect(saved?.layers.noiseMap).toBe(noise);

    finishFirst({
      statistics: [],
      totalDurationMs: 1,
    });
    await expect(first).resolves.toBeUndefined();
    expect(mapRepository.get()).toBe(saved);
    expect(renderer.state.displayedLayer).toBe('noise');
  });

  it('does not touch a renderer that is not attached', async () => {
    const mask = new Uint8Array(4).fill(1);
    runner.mockImplementation(async (_, options) => {
      options?.onStages?.(stages);
      options?.onEvent?.(completed('world-shape', { worldMask: mask }));
      return {
        statistics: [],
        totalDurationMs: 1,
      };
    });
    const add = vi.spyOn(renderer, 'add');

    await session.generate(config, vi.fn());

    expect(add).not.toHaveBeenCalled();
    expect(mapRepository.get()?.layers.worldMask).toBe(mask);
  });
});
