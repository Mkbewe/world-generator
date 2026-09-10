import type {
  PipelineWorkerGenerateRequest,
  PipelineWorkerResponse,
} from './pipeline-worker.types';
import { createMapGenerator } from '../pipeline-factory';

interface WorkerScope {
  onmessage: ((event: MessageEvent<PipelineWorkerGenerateRequest>) => void) | null;
  postMessage(message: PipelineWorkerResponse, transfer?: Transferable[]): void;
}

const workerScope = globalThis as unknown as WorkerScope;

workerScope.onmessage = event => {
  void generate(event.data);
};

async function generate(request: PipelineWorkerGenerateRequest): Promise<void> {
  try {
    const pipeline = createMapGenerator();
    const generation = await pipeline.generate(
      request.config,
      {},
      {
        onEvent: event => {
          if (event.type === 'stage-started') {
            workerScope.postMessage({ ...event, requestId: request.requestId });
            return;
          }

          if (event.type === 'stage-completed') {
            const data = structuredClone(event.data);
            workerScope.postMessage(
              { ...event, requestId: request.requestId, data },
              collectTransferables(data)
            );
            return;
          }

          workerScope.postMessage({ ...event, requestId: request.requestId });
        },
      }
    );

    const { worldMask, noiseMap } = generation.context.state;
    if (!worldMask || !noiseMap) {
      throw new Error('Pipeline completed without world mask or noise map.');
    }

    workerScope.postMessage(
      {
        type: 'result',
        requestId: request.requestId,
        result: {
          worldMask,
          noiseMap,
          statistics: generation.statistics,
          totalDurationMs: generation.totalDurationMs,
        },
      },
      [worldMask.buffer, noiseMap.buffer]
    );
  } catch (error) {
    workerScope.postMessage({
      type: 'error',
      requestId: request.requestId,
      message: error instanceof Error ? error.message : 'Pipeline generation failed.',
    });
  }
}

function collectTransferables(value: unknown): Transferable[] {
  const transferables = new Set<Transferable>();
  const visited = new WeakSet<object>();

  const visit = (current: unknown): void => {
    if (current instanceof ArrayBuffer) {
      transferables.add(current);
      return;
    }
    if (ArrayBuffer.isView(current)) {
      if (current.buffer instanceof ArrayBuffer) {
        transferables.add(current.buffer);
      }
      return;
    }
    if (typeof current !== 'object' || current === null || visited.has(current)) {
      return;
    }

    visited.add(current);
    for (const nested of Object.values(current)) {
      visit(nested);
    }
  };

  visit(value);
  return [...transferables];
}
