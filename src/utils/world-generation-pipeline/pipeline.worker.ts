import type {
  PipelineWorkerGenerateRequest,
  PipelineWorkerResponse,
} from './pipeline-worker.types';
import { createWorldGenerationPipeline } from './world-generation-pipeline-factory';

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
    const pipeline = createWorldGenerationPipeline();
    const generation = await pipeline.generate(
      request.config,
      {},
      {
        onEvent: event => {
          if (event.type === 'stage-started') {
            workerScope.postMessage({
              type: 'stage-started',
              requestId: request.requestId,
              stageId: event.stageId,
              stageName: event.stageName,
              stageIndex: event.stageIndex,
              stageCount: event.stageCount,
            });
            return;
          }

          if (event.type === 'stage-completed') {
            workerScope.postMessage({
              type: 'stage-completed',
              requestId: request.requestId,
              stageId: event.stageId,
              stageName: event.stageName,
              stageIndex: event.stageIndex,
              stageCount: event.stageCount,
              statistics: event.statistics,
            });
          }
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
