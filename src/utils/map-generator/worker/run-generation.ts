import type {
  PipelineWorkerGenerateRequest,
  PipelineWorkerGenerationResult,
  PipelineWorkerResponse,
} from './pipeline-worker.types';
import { GenerationCancelledError } from '../errors';
import type { StageInfo } from '../stage-definitions';
import type { GenerationEvent, MapConfig } from '../types';

export interface GenerationWorkerOptions {
  signal?: AbortSignal;
  onStages?: (stages: readonly StageInfo[]) => void;
  onEvent?: (event: GenerationEvent) => void;
}

export type RunGeneration = (
  config: MapConfig,
  options?: GenerationWorkerOptions
) => Promise<PipelineWorkerGenerationResult>;

/** Runs one generation in a fresh worker; aborting terminates it. */
export const runGeneration: RunGeneration = (config, options = {}) =>
  new Promise((resolve, reject) => {
    const { signal, onStages, onEvent } = options;
    const worker = new Worker(new URL('./pipeline.worker.ts', import.meta.url), {
      type: 'module',
    });
    let settled = false;

    const settle = (action: () => void): void => {
      if (settled) {
        return;
      }
      settled = true;
      signal?.removeEventListener('abort', handleAbort);
      worker.terminate();
      action();
    };

    const handleAbort = (): void => {
      settle(() => reject(new GenerationCancelledError()));
    };

    const handleMessage = (event: MessageEvent<PipelineWorkerResponse>): void => {
      if (settled || signal?.aborted) {
        return;
      }
      const message = event.data;
      if (message.type === 'stages') {
        onStages?.(message.stages);
        return;
      }
      if (message.type === 'result') {
        settle(() => resolve(message.result));
        return;
      }
      if (message.type === 'error') {
        settle(() => reject(new Error(message.message)));
        return;
      }
      try {
        onEvent?.(message);
      } catch (error) {
        settle(() => reject(error instanceof Error ? error : new Error(String(error))));
      }
    };

    if (signal?.aborted) {
      handleAbort();
      return;
    }

    signal?.addEventListener('abort', handleAbort, { once: true });
    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', event => {
      settle(() => reject(new Error(event.message || 'Pipeline worker failed.')));
    });
    worker.postMessage({ type: 'generate', config } satisfies PipelineWorkerGenerateRequest);
  });
