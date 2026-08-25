import type {
  LegacyWorldGenerationWorkerRequest,
  LegacyWorldGenerationWorkerResponse,
} from './legacy-world-generation-worker.types';
import { generateWorldPixels } from './world-generation';

interface WorkerScope {
  onmessage: ((event: MessageEvent<LegacyWorldGenerationWorkerRequest>) => void) | null;
  postMessage(message: LegacyWorldGenerationWorkerResponse, transfer: Transferable[]): void;
}

const workerScope = globalThis as unknown as WorkerScope;

workerScope.onmessage = event => {
  const { requestId, width, height, params } = event.data;
  const startedAt = performance.now();

  try {
    const result = generateWorldPixels(width, height, params);
    const response: LegacyWorldGenerationWorkerResponse = {
      type: 'result',
      requestId,
      ...result,
      computeDurationMs: performance.now() - startedAt,
    };

    workerScope.postMessage(response, [result.pixels.buffer]);
  } catch (error) {
    workerScope.postMessage(
      {
        type: 'error',
        requestId,
        message: error instanceof Error ? error.message : 'World generation failed.',
      },
      []
    );
  }
};
