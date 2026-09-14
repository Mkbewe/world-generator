export type GenerationStageStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface GenerationStageProgress {
  id: string;
  name: string;
  status: GenerationStageStatus;
  /** 0..100. Reserved for real per-stage progress. */
  percentage: number;
  durationMs?: number;
}

export interface GenerationProgressState {
  stages: readonly GenerationStageProgress[];
  status: 'running' | 'completed' | 'failed';
  totalDurationMs?: number;
}
