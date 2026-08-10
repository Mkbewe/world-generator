export interface StageStatistics {
  stageId: string;
  stageName: string;
  status: 'completed' | 'failed';
  startedAt: number;
  finishedAt: number;
  durationMs: number;
}

interface StageEventBase {
  stageId: string;
  stageName: string;
  stageIndex: number;
  stageCount: number;
}

type StageStartedEvent = StageEventBase & {
  type: 'stage-started';
};

type StageFinishedEvent = StageEventBase & {
  type: 'stage-completed' | 'stage-failed';
  statistics: StageStatistics;
};

export type GenerationEvent = StageStartedEvent | StageFinishedEvent;

export interface GenerationOptions {
  signal?: AbortSignal;
  onEvent?: (event: GenerationEvent) => void;
}

export interface GenerationResult<TContext> {
  context: TContext;
  statistics: readonly StageStatistics[];
  totalDurationMs: number;
}
