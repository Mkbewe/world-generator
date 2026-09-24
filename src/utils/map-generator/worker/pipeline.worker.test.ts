import type { GenerationWorkerScope } from './generation-worker';
import type {
  PipelineWorkerGenerateRequest,
  PipelineWorkerResponse,
} from './pipeline-worker.types';

const request: PipelineWorkerGenerateRequest = {
  type: 'generate',
  config: {
    world: {
      dimensions: { widthMeters: 2, heightMeters: 2, sampleWidth: 2, sampleHeight: 2 },
      seed: 7,
      shape: 'rectangle',
    },
    noise: { frequency: 4, octaves: 4, persistence: 0.5, lacunarity: 2 },
  },
  reuse: {
    dirtyStageIds: ['world-shape', 'noise', 'macro-region', 'landmass-layout'],
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
        { id: 'world-shape', name: 'World shape generation' },
        { id: 'noise', name: 'Noise generation' },
        { id: 'macro-region', name: 'Macro region generation' },
        { id: 'landmass-layout', name: 'Landmass layout generation' },
      ],
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
      'completed',
    ]);
  });

  it('reuses cached rasters and reports the clean stages as skipped', async () => {
    const { createMapGenerator } = await import('../pipeline-factory');
    const full = await createMapGenerator().generate(request.config, {});
    const cachedState = {
      worldMask: full.context.state.worldMask,
      noiseMap: full.context.state.noiseMap,
      landmassLayout: full.context.state.landmassLayout,
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
      'skipped',
      'completed',
      'skipped',
    ]);
    expect(messages.flatMap(item => (item.type === 'stage-skipped' ? [item.stageId] : []))).toEqual(
      ['world-shape', 'noise', 'landmass-layout']
    );
  });

  it.each(['missing', 'wrong size'] as const)('rejects %s final map data', async kind => {
    // Import the same module instance used by the freshly loaded worker.
    const { NoiseStage: WorkerNoiseStage } = await import('../stages/noise-stage');
    vi.spyOn(WorkerNoiseStage.prototype, 'execute').mockImplementation(async context => {
      const noiseMap = new Float32Array(1);
      if (kind === 'wrong size') {
        context.state.noiseMap = noiseMap;
      }
      return { noiseMap };
    });
    const message = await generate();
    expect(message).toEqual({
      type: 'error',
      message: 'Pipeline completed without all required map data.',
    });
    expect(messages.some(message => message.type === 'result')).toBe(false);
  });
});
