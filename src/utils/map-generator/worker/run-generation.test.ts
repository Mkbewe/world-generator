import type { PipelineWorkerResponse } from './pipeline-worker.types';
import { runGeneration } from './run-generation';
import { GenerationCancelledError } from '../errors';
import type { MapConfig } from '../types';

class FakeWorker {
  static latest: FakeWorker;
  readonly terminate = vi.fn();
  readonly postMessage = vi.fn();
  private readonly listeners = new Map<string, ((event: unknown) => void)[]>();

  constructor() {
    FakeWorker.latest = this;
  }

  addEventListener(type: string, listener: (event: unknown) => void): void {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  emitMessage(message: PipelineWorkerResponse): void {
    for (const listener of this.listeners.get('message') ?? []) {
      listener({ data: message });
    }
  }

  emitError(message?: string): void {
    for (const listener of this.listeners.get('error') ?? []) {
      listener({ message });
    }
  }
}

const config: MapConfig = {
  world: { width: 2, height: 2, seed: 7 },
  noise: { frequency: 4, octaves: 2, persistence: 0.5, lacunarity: 2 },
};

describe('runGeneration', () => {
  beforeEach(() => {
    vi.stubGlobal('Worker', FakeWorker);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('forwards stages and events, then resolves with the result', async () => {
    const onStages = vi.fn();
    const onEvent = vi.fn();
    const promise = runGeneration(config, { onStages, onEvent });

    FakeWorker.latest.emitMessage({ type: 'stages', stages: [{ id: 'noise', name: 'Noise' }] });
    FakeWorker.latest.emitMessage({
      type: 'stage-started',
      stageId: 'noise',
      stageName: 'Noise',
      stageIndex: 0,
      stageCount: 1,
    });
    FakeWorker.latest.emitMessage({
      type: 'result',
      result: { statistics: [], totalDurationMs: 5 },
    });

    await expect(promise).resolves.toEqual({ statistics: [], totalDurationMs: 5 });
    expect(onStages).toHaveBeenCalledWith([{ id: 'noise', name: 'Noise' }]);
    expect(onEvent).toHaveBeenCalledOnce();
    expect(FakeWorker.latest.terminate).toHaveBeenCalledOnce();
  });

  it('terminates and rejects when aborted, ignoring late messages', async () => {
    const onEvent = vi.fn();
    const controller = new AbortController();
    const promise = runGeneration(config, { signal: controller.signal, onEvent });

    controller.abort();
    await expect(promise).rejects.toBeInstanceOf(GenerationCancelledError);
    expect(FakeWorker.latest.terminate).toHaveBeenCalledOnce();

    FakeWorker.latest.emitMessage({
      type: 'stage-started',
      stageId: 'noise',
      stageName: 'Noise',
      stageIndex: 0,
      stageCount: 1,
    });
    expect(onEvent).not.toHaveBeenCalled();
  });

  it('reports the worker error message', async () => {
    const promise = runGeneration(config);

    FakeWorker.latest.emitError('Worker failed to load.');

    await expect(promise).rejects.toThrow('Worker failed to load.');
    expect(FakeWorker.latest.terminate).toHaveBeenCalledOnce();
  });
});
