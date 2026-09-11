import type { GenerationProgressState, GenerationStageProgress } from './generation-progress';
import type { GenerationEvent, StageInfo } from '../../utils/map-generator';

export function createGenerationProgress(stages: readonly StageInfo[]): GenerationProgressState {
  return {
    stages: stages.map(({ id, name }) => ({ id, name, status: 'pending', percentage: 0 })),
    status: 'running',
  };
}

export function applyGenerationEvent(
  current: GenerationProgressState,
  event: GenerationEvent
): GenerationProgressState {
  return {
    ...current,
    status: event.type === 'stage-failed' ? 'failed' : current.status,
    stages: current.stages.map((stage, index) =>
      index === event.stageIndex ? applyStageEvent(stage, event) : stage
    ),
  };
}

export function completeGenerationProgress(
  current: GenerationProgressState,
  totalDurationMs: number
): GenerationProgressState {
  return { ...current, status: 'completed', totalDurationMs };
}

function applyStageEvent(
  stage: GenerationStageProgress,
  event: GenerationEvent
): GenerationStageProgress {
  if (event.type === 'stage-started') {
    return { ...stage, name: event.stageName, status: 'running' };
  }
  if (event.type === 'stage-progress') {
    return {
      ...stage,
      name: event.stageName,
      status: 'running',
      percentage: Math.round(event.progress * 100),
    };
  }
  if (event.type === 'stage-completed') {
    return {
      ...stage,
      name: event.stageName,
      status: 'completed',
      percentage: 100,
      durationMs: event.statistics.durationMs,
    };
  }
  if (event.type === 'stage-failed') {
    return {
      ...stage,
      name: event.stageName,
      status: 'failed',
      durationMs: event.statistics.durationMs,
    };
  }
  return stage;
}
