import type { MessageKey } from '../../../../i18n';

export type ProgressStatus = 'running' | 'completed' | 'failed';

export type ProgressStageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface ProgressSourceStage {
  readonly id: string;
  readonly nameKey: MessageKey;
  readonly status: ProgressStageStatus;
  readonly percentage: number;
  readonly durationMs?: number;
}

/** Minimal progress input; the generation store state satisfies it structurally. */
export interface ProgressSource {
  readonly status: ProgressStatus;
  readonly stages: readonly ProgressSourceStage[];
  readonly startedAt?: number;
  readonly totalDurationMs?: number;
}

export type ProgressStageTrailing =
  { readonly kind: 'duration'; readonly durationMs: number } | { readonly kind: 'skipped' };

export interface ProgressStageViewModel {
  readonly id: string;
  readonly nameKey: MessageKey;
  readonly status: ProgressStageStatus;
  readonly percentage: number;
  readonly trailing?: ProgressStageTrailing;
  readonly barLabelKey?: MessageKey;
}

export interface ProgressViewModel {
  readonly status: ProgressStatus;
  readonly startedAt?: number;
  readonly totalDurationMs?: number;
  readonly completed: number;
  readonly skipped: number;
  readonly total: number;
  readonly stages: readonly ProgressStageViewModel[];
}

const BAR_LABEL_KEYS: Partial<Record<ProgressStageStatus, MessageKey>> = {
  completed: 'progress.stage.completed',
  skipped: 'progress.stage.skipped',
};

/** Turns the store-shaped progress state into a presentation model. */
export function buildProgressViewModel(source: ProgressSource): ProgressViewModel {
  return {
    status: source.status,
    startedAt: source.startedAt,
    totalDurationMs: source.totalDurationMs,
    completed: source.stages.filter(stage => stage.status === 'completed').length,
    skipped: source.stages.filter(stage => stage.status === 'skipped').length,
    total: source.stages.length,
    stages: source.stages.map(stage => ({
      id: stage.id,
      nameKey: stage.nameKey,
      status: stage.status,
      percentage: stage.percentage,
      trailing: stageTrailing(stage),
      barLabelKey: BAR_LABEL_KEYS[stage.status],
    })),
  };
}

function stageTrailing(stage: ProgressSourceStage): ProgressStageTrailing | undefined {
  if (stage.status === 'skipped') {
    return { kind: 'skipped' };
  }
  if (stage.durationMs === undefined) {
    return undefined;
  }
  return { kind: 'duration', durationMs: stage.durationMs };
}
