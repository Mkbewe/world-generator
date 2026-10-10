import type { GenerationWorkerScope } from './generation-worker';
import type {
  PipelineWorkerGenerateRequest,
  PipelineWorkerResponse,
} from './pipeline-worker.types';
import type { MapState } from '../types';

const request: PipelineWorkerGenerateRequest = {
  type: 'generate',
  config: {
    world: {
      dimensions: { widthMeters: 16, heightMeters: 16, sampleWidth: 16, sampleHeight: 16 },
      seed: 7,
      shape: 'rectangle',
    },
  },
  reuse: {
    dirtyStageIds: ['world-shape', 'macro-region', 'geology'],
    cachedState: {},
  },
};

describe('generation worker', () => {
  const messages: PipelineWorkerResponse[] = [];
  let scope!: GenerationWorkerScope;

  beforeEach(async () => {
    vi.resetModules();
    messages.length = 0;
    vi.stubEnv('VITE_GENERATION_STAGE_DELAY_MS', '0');
    scope = {
      onmessage: null,
      postMessage: message => messages.push(message),
    };
    const { startGenerationWorker } = await import('./generation-worker');
    startGenerationWorker(scope);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  async function generate(data: PipelineWorkerGenerateRequest = request) {
    scope.onmessage?.(new MessageEvent('message', { data }));
    await vi.waitFor(() => {
      expect(messages.some(message => message.type === 'result' || message.type === 'error')).toBe(
        true
      );
    });
    return messages.at(-1);
  }

  it('announces its stages and returns generation statistics once the map data is complete', async () => {
    const message = await generate();

    expect(messages[0]).toEqual({
      type: 'stages',
      stages: [
        { id: 'world-shape', name: 'World shape' },
        { id: 'macro-region', name: 'Macro region' },
        { id: 'geology', name: 'Geology' },
      ],
      skippedStageIds: [],
    });
    expect(message?.type).toBe('result');
    if (message?.type !== 'result') {
      throw new Error('Expected a generation result.');
    }
    expect(message.result).not.toHaveProperty('layers');
    expect(message.result.statistics.map(stage => stage.status)).toEqual([
      'completed',
      'completed',
      'completed',
    ]);
  });

  it('reuses cached rasters and reports the clean stages as skipped', async () => {
    const { createMapGenerator } = await import('../pipeline/pipeline-factory');
    const full = await createMapGenerator().generate(request.config, {});
    const cachedState = {
      worldMask: full.context.state.worldMask,
      macroRegionIdMap: full.context.state.macroRegionIdMap,
      geologyPlan: full.context.state.geologyPlan,
    };

    const message = await generate({
      ...request,
      reuse: { dirtyStageIds: ['macro-region'], cachedState },
    });

    expect(message?.type).toBe('result');
    if (message?.type !== 'result') {
      throw new Error('Expected a generation result.');
    }
    expect(message.result.statistics.map(statistic => statistic.status)).toEqual([
      'skipped',
      'completed',
      'skipped',
    ]);
    expect(messages.flatMap(item => (item.type === 'stage-skipped' ? [item.stageId] : []))).toEqual(
      ['world-shape', 'geology']
    );
  });

  it('reruns a clean stage whose declared writes are missing from cache', async () => {
    const { createMapGenerator } = await import('../pipeline/pipeline-factory');
    const full = await createMapGenerator().generate(request.config, {});
    const cachedState = { ...full.context.state };
    delete cachedState.macroRegionIdMap;

    const message = await generate({ ...request, reuse: { dirtyStageIds: [], cachedState } });

    expect(message?.type).toBe('result');
    if (message?.type !== 'result') {
      throw new Error('Expected a generation result.');
    }
    // Only the incomplete stage runs; the rule follows declared writes alone.
    expect(message.result.statistics.map(statistic => statistic.status)).toEqual([
      'skipped',
      'completed',
      'skipped',
    ]);
  });

  it('recomputes geology when only the sample resolution changes', async () => {
    const { createMapGenerator } = await import('../pipeline/pipeline-factory');
    const { selectDirtyStageIds } = await import('../pipeline/selective-regeneration');
    const full = await createMapGenerator().generate(request.config, {});
    const resized = {
      ...request.config,
      world: {
        ...request.config.world,
        dimensions: { ...request.config.world.dimensions, sampleWidth: 8, sampleHeight: 8 },
      },
    };

    const message = await generate({
      type: 'generate',
      config: resized,
      reuse: {
        dirtyStageIds: selectDirtyStageIds(request.config, resized),
        cachedState: { ...full.context.state },
      },
    });

    expect(message?.type).toBe('result');
    const skipped = messages.flatMap(item => (item.type === 'stage-skipped' ? [item.stageId] : []));
    expect(skipped).not.toContain('geology');
  });

  it('reruns a clean stage whose cached write has the wrong type', async () => {
    const { createMapGenerator } = await import('../pipeline/pipeline-factory');
    const full = await createMapGenerator().generate(request.config, {});
    const cachedState: MapState = {
      ...full.context.state,
      // @ts-expect-error the wrong constructor is the case under test
      macroRegionIdMap: new Float32Array(4),
    };

    const message = await generate({ ...request, reuse: { dirtyStageIds: [], cachedState } });

    expect(message?.type).toBe('result');
    if (message?.type !== 'result') {
      throw new Error('Expected a generation result.');
    }
    expect(message.result.statistics.map(statistic => statistic.status)).toEqual([
      'skipped',
      'completed',
      'skipped',
    ]);
  });

  it('rejects invalid final map data', async () => {
    // Import the same module instance used by the freshly loaded worker.
    const { WorldShapeStage } = await import('../stages/world-shape');
    vi.spyOn(WorldShapeStage.prototype, 'execute').mockResolvedValue({
      worldMask: new Uint8Array(1),
    });
    const message = await generate();
    expect(message).toEqual({
      type: 'error',
      message: 'Pipeline completed without all required map data.',
    });
    expect(messages.some(message => message.type === 'result')).toBe(false);
  });
});
