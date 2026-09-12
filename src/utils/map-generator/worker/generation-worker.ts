import type {
  PipelineWorkerGenerateRequest,
  PipelineWorkerResponse,
} from './pipeline-worker.types';
import { GenerationStageError } from '../errors';
import { createMapGenerator } from '../pipeline-factory';

export interface GenerationWorkerScope {
  onmessage: ((event: MessageEvent<PipelineWorkerGenerateRequest>) => void) | null;
  postMessage(message: PipelineWorkerResponse): void;
}

/** Wires the pipeline into a worker scope; the worker entry calls it once. */
export function startGenerationWorker(scope: GenerationWorkerScope): void {
  scope.onmessage = event => {
    void generate(scope, event.data);
  };
}

async function generate(
  scope: GenerationWorkerScope,
  request: PipelineWorkerGenerateRequest
): Promise<void> {
  const generator = createMapGenerator();
  scope.postMessage({
    type: 'stages',
    stages: generator.stages.map(({ id, name }) => ({ id, name })),
  });

  try {
    const generation = await generator.generate(
      request.config,
      {},
      {
        onEvent: event => {
          // postMessage copies stage data; the generator keeps its working buffers.
          scope.postMessage(event);
        },
      }
    );
    scope.postMessage({
      type: 'result',
      result: {
        statistics: generation.statistics,
        totalDurationMs: generation.totalDurationMs,
      },
    });
  } catch (error) {
    scope.postMessage({
      type: 'error',
      message: errorMessage(error),
    });
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof GenerationStageError && error.cause instanceof Error) {
    return error.cause.message;
  }
  return error instanceof Error ? error.message : 'Pipeline generation failed.';
}
