import type {
  PipelineWorkerGenerateRequest,
  PipelineWorkerResponse,
} from './pipeline-worker.types';

const request: PipelineWorkerGenerateRequest = {
  type: 'generate',
  requestId: 1,
  config: {
    world: { width: 2, height: 2, seed: 7, shape: 'rectangle' },
    noise: { frequency: 4, octaves: 4, persistence: 0.5, lacunarity: 2 },
  },
};

describe('pipeline worker result', () => {
  const messages: PipelineWorkerResponse[] = [];

  beforeEach(async () => {
    vi.resetModules();
    messages.length = 0;
    vi.stubEnv('VITE_GENERATION_STAGE_DELAY_MS', '0');
    vi.stubGlobal('onmessage', null);
    vi.stubGlobal('postMessage', (message: PipelineWorkerResponse) => messages.push(message));
    await import('./pipeline.worker');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  async function generate() {
    globalThis.onmessage?.call(window, new MessageEvent('message', { data: request }));
    await vi.waitFor(() => {
      expect(messages.some(message => message.type === 'result' || message.type === 'error')).toBe(
        true
      );
    });
    return messages.at(-1);
  }

  it('returns complete map data without a renderer', async () => {
    const message = await generate();
    expect(message?.type).toBe('result');
    if (message?.type !== 'result') {
      throw new Error('Expected a generation result.');
    }
    expect(message.result.layers.worldMask).toEqual(new Uint8Array(4).fill(1));
    expect(message.result.layers.noiseMap).toBeInstanceOf(Float32Array);
    expect(message.result.layers.noiseMap).toHaveLength(4);
    expect(message.result.statistics.map(stage => stage.status)).toEqual([
      'completed',
      'completed',
    ]);
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
      requestId: 1,
      message: 'Pipeline completed without all required map data.',
    });
    expect(messages.some(message => message.type === 'result')).toBe(false);
  });
});
