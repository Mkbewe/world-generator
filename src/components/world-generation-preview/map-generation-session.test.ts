import { MapGenerationSession } from './map-generation-session';
import {
  type GenerationEvent,
  type MapConfig,
  PipelineWorkerClient,
  type PipelineWorkerGenerationResult,
} from '../../utils/map-generator';
import {
  LAYER_DEFINITIONS,
  LayerRegistry,
  MapRenderer,
  mapRepository,
} from '../../utils/map-renderer';
import { LayerCache, MapLayer } from '../../utils/map-renderer/layer';
import { Viewport } from '../../utils/map-renderer/viewport';

const config: MapConfig = {
  world: { width: 2, height: 2, seed: 17 },
  noise: { frequency: 4, octaves: 4, persistence: 0.5, lacunarity: 2 },
};

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

describe('MapGenerationSession', () => {
  let renderer: MapRenderer;
  let session: MapGenerationSession;
  const registry = new LayerRegistry({
    ...LAYER_DEFINITIONS,
    noise: { ...LAYER_DEFINITIONS.noise, source: 'elevation' },
  });

  beforeEach(() => {
    mapRepository.clear();
    vi.spyOn(Viewport.prototype, 'start').mockImplementation(() => {});
    vi.spyOn(Viewport.prototype, 'measure').mockReturnValue(undefined);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      clearRect: vi.fn(),
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(MapLayer.prototype, 'prepare').mockResolvedValue();
    renderer = new MapRenderer(
      {
        canvas: document.createElement('canvas'),
        overlayCanvas: document.createElement('canvas'),
        viewportElement: document.createElement('div'),
      },
      vi.fn(),
      { cache: new LayerCache(), registry }
    );
    session = new MapGenerationSession(renderer);
  });

  afterEach(() => {
    session.cancel();
    renderer.dispose();
    mapRepository.clear();
    vi.restoreAllMocks();
  });

  it('maps registered stage data and saves map metadata after generation', async () => {
    const mask = new Uint8Array(4).fill(1);
    const elevation = new Float32Array(4);
    const result = {
      statistics: [],
      totalDurationMs: 2,
    };
    const dispose = vi.spyOn(PipelineWorkerClient.prototype, 'dispose');
    vi.spyOn(PipelineWorkerClient.prototype, 'generate').mockImplementation(async (_, options) => {
      options?.onEvent?.({
        type: 'stage-started',
        stageId: 'world-shape',
        stageName: 'World shape',
        stageIndex: 0,
        stageCount: 2,
      });
      options?.onEvent?.(completed('world-shape', { worldMask: mask }));
      options?.onEvent?.(completed('statistics-only', { elevation }));
      options?.onEvent?.(completed('noise', { elevation }));
      return result;
    });

    const onProgress = vi.fn();
    await expect(session.generate(config, onProgress)).resolves.toEqual({
      statistics: result.statistics,
      totalDurationMs: result.totalDurationMs,
    });
    await renderer.ready;

    expect(mapRepository.get()).toMatchObject({
      width: 2,
      height: 2,
      seed: '17',
      shape: 'disc',
    });
    expect(mapRepository.get()?.layers.worldMask).toBe(mask);
    expect(mapRepository.get()?.layers.elevation).toBe(elevation);
    expect(mapRepository.get()?.layers.noiseMap).toBeUndefined();
    expect(renderer.state.displayedLayer).toBe('noise');
    expect(onProgress.mock.lastCall?.[0].status).toBe('completed');
    expect(dispose).toHaveBeenCalledOnce();
  });

  it('rejects missing stage data without saving an incomplete map', async () => {
    const dispose = vi.spyOn(PipelineWorkerClient.prototype, 'dispose');
    vi.spyOn(PipelineWorkerClient.prototype, 'generate').mockImplementation(async (_, options) => {
      options?.onEvent?.(completed('world-shape', {}));
      return {
        statistics: [],
        totalDurationMs: 1,
      };
    });

    await expect(session.generate(config, vi.fn())).rejects.toThrow('Invalid world mask.');
    expect(mapRepository.get()).toBeUndefined();
    expect(dispose).toHaveBeenCalledOnce();
  });

  it('saves generated stage data even when the preview is cancelled', async () => {
    const mask = new Uint8Array(4).fill(1);
    const elevation = new Float32Array(4);
    const add = vi.spyOn(renderer, 'add');
    vi.spyOn(PipelineWorkerClient.prototype, 'generate').mockImplementation(async (_, options) => {
      renderer.cancel();
      options?.onEvent?.(completed('world-shape', { worldMask: mask }));
      options?.onEvent?.(completed('noise', { elevation }));
      return {
        statistics: [],
        totalDurationMs: 1,
      };
    });

    await expect(session.generate(config, vi.fn())).resolves.toMatchObject({ totalDurationMs: 1 });

    expect(add).not.toHaveBeenCalled();
    expect(renderer.state.layers.every(layer => !layer.available)).toBe(true);
    expect(mapRepository.get()?.layers.worldMask).toBe(mask);
    expect(mapRepository.get()?.layers.elevation).toBe(elevation);
  });

  it('does not save when the generator rejects its incomplete result', async () => {
    vi.spyOn(PipelineWorkerClient.prototype, 'generate').mockRejectedValue(
      new Error('Pipeline completed without all required map data.')
    );
    await expect(session.generate(config, vi.fn())).rejects.toThrow('required map data');
    expect(mapRepository.get()).toBeUndefined();
  });

  it('cancels generation while allowing queued rendering to finish', async () => {
    let onEvent: ((event: GenerationEvent) => void) | undefined;
    let finish!: (result: PipelineWorkerGenerationResult) => void;
    vi.spyOn(PipelineWorkerClient.prototype, 'generate').mockImplementation((_, options) => {
      onEvent = options?.onEvent;
      return new Promise(resolve => {
        finish = resolve;
      });
    });
    const dispose = vi.spyOn(PipelineWorkerClient.prototype, 'dispose');
    const generation = session.generate(config, vi.fn());
    const cancelled = expect(generation).resolves.toBeUndefined();
    let finishDrawing!: () => void;
    vi.spyOn(MapLayer.prototype, 'prepare').mockReturnValue(
      new Promise(resolve => {
        finishDrawing = resolve;
      })
    );
    onEvent?.(completed('world-shape', { worldMask: new Uint8Array(4) }));
    const renderSignal = renderer.signal;
    session.cancel();
    expect(dispose).toHaveBeenCalledOnce();
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

  it.each(['cancel', 'reset', 'dispose', 'restart'] as const)(
    'keeps generating after renderer %s and stops sending data to the old render run',
    async action => {
      let onEvent: ((event: GenerationEvent) => void) | undefined;
      let finish!: (result: PipelineWorkerGenerationResult) => void;
      vi.spyOn(PipelineWorkerClient.prototype, 'generate').mockImplementation((_, options) => {
        onEvent = options?.onEvent;
        return new Promise(resolve => {
          finish = resolve;
        });
      });
      const dispose = vi.spyOn(PipelineWorkerClient.prototype, 'dispose');
      const onProgress = vi.fn();
      const generation = session.generate(config, onProgress);
      const add = vi.spyOn(renderer, 'add');

      if (action === 'restart') {
        renderer.start(config.world);
      } else {
        renderer[action]();
      }

      expect(dispose).not.toHaveBeenCalled();
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

  it('restores saved layers using the same registry as generation', async () => {
    const mask = new Uint8Array(4).fill(1);
    const elevation = new Float32Array(4);
    const snapshot = {
      width: 2,
      height: 2,
      seed: '17',
      shape: 'disc' as const,
      layers: { worldMask: mask, elevation },
    };
    mapRepository.save(snapshot);

    session.restore();
    await renderer.ready;

    expect(renderer.state.displayedLayer).toBe('noise');
    expect(renderer.state.layers.find(layer => layer.id === 'noise')?.available).toBe(true);
    expect(mapRepository.get()).toBe(snapshot);
  });

  it('starts a new run itself and prevents the previous run from overwriting its result', async () => {
    let finishFirst!: (result: PipelineWorkerGenerationResult) => void;
    let firstEvent: ((event: GenerationEvent) => void) | undefined;
    const mask = new Uint8Array(4).fill(1);
    const elevation = new Float32Array(4);
    vi.spyOn(PipelineWorkerClient.prototype, 'generate')
      .mockImplementationOnce((_, options) => {
        firstEvent = options?.onEvent;
        return new Promise(resolve => {
          finishFirst = resolve;
        });
      })
      .mockImplementationOnce(async (_, options) => {
        options?.onEvent?.(completed('world-shape', { worldMask: mask }));
        options?.onEvent?.(completed('noise', { elevation }));
        return {
          statistics: [],
          totalDurationMs: 2,
        };
      });
    const dispose = vi.spyOn(PipelineWorkerClient.prototype, 'dispose');

    const first = session.generate(config, vi.fn());
    const firstSignal = renderer.signal;
    const second = session.generate({ ...config, world: { ...config.world, seed: 99 } }, vi.fn());
    expect(firstSignal.aborted).toBe(true);
    expect(dispose).toHaveBeenCalledOnce();
    expect(() => firstEvent?.(completed('world-shape', { worldMask: mask }))).toThrow();
    await expect(second).resolves.toMatchObject({ totalDurationMs: 2 });
    const saved = mapRepository.get();
    expect(saved?.seed).toBe('99');
    expect(saved?.layers.worldMask).toBe(mask);
    expect(saved?.layers.elevation).toBe(elevation);

    finishFirst({
      statistics: [],
      totalDurationMs: 1,
    });
    await expect(first).resolves.toBeUndefined();
    expect(mapRepository.get()).toBe(saved);
    expect(renderer.state.displayedLayer).toBe('noise');
  });
});
