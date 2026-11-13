import { isPipelineWorkerGenerateRequest } from './pipeline-worker.guards';
import type {
  PipelineWorkerGenerateRequest,
  PipelineWorkerResponse,
} from './pipeline-worker.types';
import type { MessageKey } from '../../../i18n';
import { GenerationStageError } from '../errors';
import { createMapGenerator } from '../pipeline/pipeline-factory';
import { isPipelineStageId, type StageInfo } from '../pipeline/stage-definitions';
import { isPersistentRasterValue, isRasterOutputKey } from '../pipeline/stage-outputs';
import type { MapState } from '../types';

export interface GenerationWorkerScope {
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
  postMessage(message: PipelineWorkerResponse): void;
}

export function isGenerationWorkerScope(value: unknown): value is GenerationWorkerScope {
  return (
    typeof value === 'object' &&
    value !== null &&
    'postMessage' in value &&
    typeof value.postMessage === 'function'
  );
}

/** Wires the pipeline into a worker scope; the worker entry calls it once. */
export function startGenerationWorker(scope: GenerationWorkerScope): void {
  scope.onmessage = event => {
    const request = event.data;
    if (!isPipelineWorkerGenerateRequest(request)) {
      scope.postMessage({ type: 'error', message: 'Invalid pipeline worker request.' });
      return;
    }
    void generate(scope, request);
  };
}

async function generate(
  scope: GenerationWorkerScope,
  request: PipelineWorkerGenerateRequest
): Promise<void> {
  const generator = createMapGenerator();
  const dirty = new Set(request.reuse.dirtyStageIds);
  const cached = request.reuse.cachedState;
  // A stage reruns when the config changed, when its own writes are missing
  // or invalid, or when it reads a state key written by a stage that reruns in
  // this pass. The dependency follows `reads`/`writes` alone, so a stage
  // executed because of a missing output also invalidates its consumers.
  const writers = new Map<string, string>();
  for (const stage of generator.stages) {
    for (const key of stage.writes ?? []) {
      writers.set(String(key), stage.id);
    }
  }
  const runIds = new Set<string>();
  for (const stage of generator.stages) {
    const staleInput = (stage.reads ?? []).some(key => {
      const writer = writers.get(String(key));
      return writer !== undefined && runIds.has(writer);
    });
    if (dirty.has(stage.id) || !hasCachedWrites(stage, cached) || staleInput) {
      runIds.add(stage.id);
    }
  }
  const skipStageIds = generator.stages
    .filter(stage => !runIds.has(stage.id))
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

function announceStages(stages: readonly { id: string; nameKey: MessageKey }[]): StageInfo[] {
  return stages.map(stage => {
    if (!isPipelineStageId(stage.id)) {
      throw new Error(`Unknown stage id: "${stage.id}".`);
    }
    return { id: stage.id, nameKey: stage.nameKey };
  });
}

function errorMessage(error: unknown): string {
  if (error instanceof GenerationStageError && error.cause instanceof Error) {
    return error.cause.message;
  }
  return error instanceof Error ? error.message : 'Pipeline generation failed.';
}
