import type {
  PipelineWorkerGenerateRequest,
  PipelineWorkerResponse,
} from './pipeline-worker.types';
import { GenerationStageError } from '../errors';
import { createMapGenerator } from '../pipeline/pipeline-factory';
import { isPipelineStageId, type StageInfo } from '../pipeline/stage-definitions';
import { isPersistentRasterValue, isRasterOutputKey } from '../pipeline/stage-outputs';
import type { MapState } from '../types';

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
  const dirty = new Set(request.reuse.dirtyStageIds);
  const cached = request.reuse.cachedState;
  // A clean stage is skipped only with all its declared writes in cache.
  // Missing outputs recompute instead of flowing downstream silently; no
  // domain object is named here, the rule follows the stage contract alone.
  const skipStageIds = generator.stages
    .filter(stage => !dirty.has(stage.id) && hasCachedWrites(stage, cached))
    .map(stage => stage.id);
  // The session renders progress from the real skip set, not from its guess.
  scope.postMessage({
    type: 'stages',
    stages: announceStages(generator.stages),
    skippedStageIds: skipStageIds,
  });

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

/**
 * Whether every declared write of the stage is present and valid in the cached
 * state. Raster outputs must pass the persistent constructor contract; domain
 * outputs are shape-checked when the session stores them.
 */
function hasCachedWrites(
  stage: { readonly writes?: readonly (keyof MapState)[] },
  cached: MapState
): boolean {
  return (stage.writes ?? []).every(key => {
    const value = cached[key];
    if (value === undefined) {
      return false;
    }
    return !isRasterOutputKey(key) || isPersistentRasterValue(key, value);
  });
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
