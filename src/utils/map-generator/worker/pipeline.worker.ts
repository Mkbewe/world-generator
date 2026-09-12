import type {
  PipelineWorkerGenerateRequest,
  PipelineWorkerResponse,
} from './pipeline-worker.types';
import { createMapGenerator } from '../pipeline-factory';

interface WorkerScope {
  onmessage: ((event: MessageEvent<PipelineWorkerGenerateRequest>) => void) | null;
  postMessage(message: PipelineWorkerResponse): void;
}

const workerScope = globalThis as unknown as WorkerScope;

workerScope.onmessage = event => {
  void generate(event.data);
};

async function generate(request: PipelineWorkerGenerateRequest): Promise<void> {
  try {
    const generation = await createMapGenerator().generate(
      request.config,
      {},
      {
        onEvent: event => {
          // postMessage copies stage data; the generator keeps its working buffers.
          workerScope.postMessage({ ...event, requestId: request.requestId });
        },
      }
    );
    const { worldMask, noiseMap } = generation.context.state;
    const cells = request.config.world.width * request.config.world.height;
    if (
      !(worldMask instanceof Uint8Array) ||
      worldMask.length !== cells ||
      !(noiseMap instanceof Float32Array) ||
      noiseMap.length !== cells
    ) {
      throw new Error('Pipeline completed without all required map data.');
    }
    workerScope.postMessage({
      type: 'result',
      requestId: request.requestId,
      result: {
        layers: { ...generation.context.state, worldMask, noiseMap },
        statistics: generation.statistics,
        totalDurationMs: generation.totalDurationMs,
      },
    });
  } catch (error) {
    workerScope.postMessage({
      type: 'error',
      requestId: request.requestId,
      message: error instanceof Error ? error.message : 'Pipeline generation failed.',
    });
  }
}
