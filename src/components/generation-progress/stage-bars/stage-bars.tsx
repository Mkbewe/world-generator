import type {
  GenerationProgressState,
  GenerationStageProgress,
  GenerationStageStatus,
} from '../lib/progress-types';
import styles from './stage-bars.module.scss';

const STATUS_WIDTH: Record<GenerationStageStatus, (stage: GenerationStageProgress) => string> = {
  pending: () => '0%',
  running: stage => `${stage.percentage}%`,
  completed: () => '100%',
  failed: () => '100%',
  skipped: () => '100%',
};

const STATUS_LABEL: Partial<Record<GenerationStageStatus, string>> = {
  completed: 'completed',
  skipped: 'skipped',
};

interface StageBarsProps {
  stages: readonly GenerationStageProgress[];
  status: GenerationProgressState['status'];
}

export function StageBars({ stages, status }: StageBarsProps) {
  return (
    <div className={styles.bars} data-complete={status === 'completed'}>
      {stages.map(stage => (
        <div key={stage.id} className={styles.bar} data-status={stage.status}>
          <div className={styles.barFill} style={{ width: STATUS_WIDTH[stage.status](stage) }} />
          {STATUS_LABEL[stage.status] && (
            <span className={styles.barLabel}>{STATUS_LABEL[stage.status]}</span>
          )}
        </div>
      ))}
    </div>
  );
}
