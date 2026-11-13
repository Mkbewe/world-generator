import type {
  PipelineWorkerGenerateRequest,
  PipelineWorkerResponse,
  PipelineWorkerReuse,
} from './pipeline-worker.types';
import { isPipelineStageId, type StageInfo } from '../pipeline/stage-definitions';
import type { GenerationEvent, MapConfig, StageStatistics } from '../types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStageInfo(value: unknown): value is StageInfo {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === 'string' && isPipelineStageId(value.id) && typeof value.nameKey === 'string'
  );
}

function isStageStatistics(value: unknown): value is StageStatistics {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.stageId === 'string' &&
    typeof value.stageNameKey === 'string' &&
    (value.status === 'completed' || value.status === 'failed' || value.status === 'skipped') &&
    typeof value.startedAt === 'number' &&
    typeof value.finishedAt === 'number' &&
    typeof value.durationMs === 'number' &&
    (value.details === undefined || isRecord(value.details))
  );
}

function isStageEventBase(value: Record<string, unknown>): boolean {
  return (
    typeof value.stageId === 'string' &&
    typeof value.stageNameKey === 'string' &&
    typeof value.stageIndex === 'number' &&
    typeof value.stageCount === 'number'
  );
}

function isGenerationEvent(value: unknown): value is GenerationEvent {
  if (!isRecord(value) || !isStageEventBase(value)) {
    return false;
  }
  switch (value.type) {
    case 'stage-started':
      return true;
    case 'stage-progress':
      return typeof value.progress === 'number';
    case 'stage-completed':
      return isStageStatistics(value.statistics) && isRecord(value.data);
    case 'stage-failed':
    case 'stage-skipped':
      return isStageStatistics(value.statistics);
    default:
      return false;
  }
}

function isStagesResponse(value: Record<string, unknown>): boolean {
  return (
    value.type === 'stages' &&
    Array.isArray(value.stages) &&
    value.stages.every(isStageInfo) &&
    Array.isArray(value.skippedStageIds) &&
    value.skippedStageIds.every(
      stageId => typeof stageId === 'string' && isPipelineStageId(stageId)
    )
  );
}

function isResultResponse(value: Record<string, unknown>): boolean {
  const result = value.result;
  if (!isRecord(result)) {
    return false;
  }
  return (
    value.type === 'result' &&
    Array.isArray(result.statistics) &&
    result.statistics.every(isStageStatistics) &&
    typeof result.totalDurationMs === 'number'
  );
}

export function isPipelineWorkerResponse(value: unknown): value is PipelineWorkerResponse {
  if (!isRecord(value)) {
    return false;
  }
  if (isStagesResponse(value) || isResultResponse(value)) {
    return true;
  }
  if (value.type === 'error') {
    return typeof value.message === 'string';
  }
  return isGenerationEvent(value);
}

function isReuse(value: unknown): value is PipelineWorkerReuse {
  if (!isRecord(value)) {
    return false;
  }
  return (
    Array.isArray(value.dirtyStageIds) &&
    value.dirtyStageIds.every(
      stageId => typeof stageId === 'string' && isPipelineStageId(stageId)
    ) &&
    isRecord(value.cachedState)
  );
}

function isMapConfig(value: unknown): value is MapConfig {
  return isRecord(value) && isRecord(value.world);
}

export function isPipelineWorkerGenerateRequest(
  value: unknown
): value is PipelineWorkerGenerateRequest {
  return (
    isRecord(value) &&
    value.type === 'generate' &&
    isMapConfig(value.config) &&
    isReuse(value.reuse)
  );
}
