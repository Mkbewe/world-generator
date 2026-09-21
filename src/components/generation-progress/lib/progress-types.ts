export type GenerationStageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

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
  /** performance.now() timestamp of the run start; falls back to the mount time. */
  startedAt?: number;
  totalDurationMs?: number;
}
