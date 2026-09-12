import type { GenerationProgressState, GenerationStageProgress } from './generation-progress';
import type { GenerationEvent, StageInfo } from '../../utils/map-generator';

export class ProgressTracker {
  private state: GenerationProgressState;

  constructor(
    stages: readonly StageInfo[],
    private readonly emit: (state: GenerationProgressState) => void
  ) {
    this.state = {
      stages: stages.map(({ id, name }) => ({ id, name, status: 'pending', percentage: 0 })),
      status: 'running',
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
    stages: current.stages.map((stage, index) =>
      index === event.stageIndex ? applyStageEvent(stage, event) : stage
    ),
  };
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
