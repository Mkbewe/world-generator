import type {
  PipelineWorkerGenerateRequest,
  PipelineWorkerResponse,
} from './pipeline-worker.types';
import { GenerationStageError } from '../errors';
import { createMapGenerator } from '../pipeline/pipeline-factory';
import { isPipelineStageId, type StageInfo } from '../pipeline/stage-definitions';

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
    stages: announceStages(generator.stages),
  });

  const dirty = new Set(request.reuse.dirtyStageIds);
  const skipStageIds = generator.stages
    .filter(stage => !dirty.has(stage.id))
    .map(stage => stage.id);

  try {
    const generation = await generator.generate(
      request.config,
      { ...request.reuse.cachedState },
      {
        skipStageIds,
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

function announceStages(stages: readonly { id: string; name: string }[]): StageInfo[] {
  return stages.map(stage => {
    if (!isPipelineStageId(stage.id)) {
      throw new Error(`Unknown stage id: "${stage.id}".`);
    }
    return { id: stage.id, name: stage.name };
  });
}

function errorMessage(error: unknown): string {
  if (error instanceof GenerationStageError && error.cause instanceof Error) {
    return error.cause.message;
  }
  return error instanceof Error ? error.message : 'Pipeline generation failed.';
}
