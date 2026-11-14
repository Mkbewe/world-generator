import type { GenerationEvent, StageInfo } from '@generator';

import type { MessageKey } from '../../../../i18n';
import type { GenerationProgressState, GenerationStageProgress } from '../../../../stores';

export class ProgressTracker {
  private state: GenerationProgressState;

  constructor(
    stages: readonly StageInfo[],
    private readonly emit: (state: GenerationProgressState) => void,
    skippedStageIds: readonly string[]
  ) {
    const skipped = new Set(skippedStageIds);
    this.state = {
      stages: stages.map(stage => initialStage(stage, skipped)),
      status: 'running',
      startedAt: performance.now(),
    };
  }

  start(): void {
    this.emit(this.state);
  }

  handle(event: GenerationEvent): void {
    this.state = applyEvent(this.state, event);
    this.emit(this.state);
  }

  complete(totalDurationMs: number): void {
    this.state = { ...this.state, status: 'completed', totalDurationMs };
    this.emit(this.state);
  }
}

function applyEvent(
  current: GenerationProgressState,
  event: GenerationEvent
): GenerationProgressState {
  return {
    ...current,
    status: event.type === 'stage-failed' ? 'failed' : current.status,
    stages: current.stages.map(stage =>
      stage.id === event.stageId ? applyStageEvent(stage, event) : stage
    ),
  };
}

/**
 * Initial state of a new run for the known stage list: reused stages are marked
 * as skipped right away, before the worker reports anything.
 */
export function planProgress(
  stages: readonly { id: string; nameKey: MessageKey }[],
  skippedStageIds: readonly string[]
): GenerationProgressState {
  const skipped = new Set(skippedStageIds);
  return {
    status: 'running',
    startedAt: performance.now(),
    stages: stages.map(stage => initialStage(stage, skipped)),
  };
}

function initialStage(
  stage: { id: string; nameKey: MessageKey },
  skipped: ReadonlySet<string>
): GenerationStageProgress {
  return {
    id: stage.id,
    nameKey: stage.nameKey,
    status: skipped.has(stage.id) ? 'skipped' : 'pending',
    percentage: 0,
  };
}

function applyStageEvent(
  stage: GenerationStageProgress,
  event: GenerationEvent
): GenerationStageProgress {
  const current = { ...stage, nameKey: event.stageNameKey };

  switch (event.type) {
    case 'stage-started':
      return { ...current, status: 'running' };
    case 'stage-progress':
      return { ...current, status: 'running', percentage: Math.round(event.progress * 100) };
    case 'stage-completed':
      return {
        ...current,
        status: 'completed',
        percentage: 100,
        durationMs: event.statistics.durationMs,
      };
    case 'stage-failed':
      return { ...current, status: 'failed', durationMs: event.statistics.durationMs };
    case 'stage-skipped':
      return { ...current, status: 'skipped', durationMs: event.statistics.durationMs };
    default:
      return stage;
  }
}
