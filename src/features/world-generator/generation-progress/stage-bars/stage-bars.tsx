import { useTranslation } from 'react-i18next';

import type { ProgressStageStatus, ProgressStageViewModel } from '../lib/progress-view-model';
import styles from './stage-bars.module.scss';

const STATUS_WIDTH: Record<ProgressStageStatus, (stage: ProgressStageViewModel) => string> = {
  pending: () => '0%',
  running: stage => `${stage.percentage}%`,
  completed: () => '100%',
  failed: () => '100%',
  skipped: () => '100%',
};

interface StageBarsProps {
  stages: readonly ProgressStageViewModel[];
  complete: boolean;
}

export function StageBars({ stages, complete }: StageBarsProps) {
  const { t } = useTranslation();

  return (
    <div className={styles.bars} data-complete={complete}>
      {stages.map(stage => (
        <div key={stage.id} className={styles.bar} data-status={stage.status}>
          <div className={styles.barFill} style={{ width: STATUS_WIDTH[stage.status](stage) }} />
          {stage.barLabelKey && <span className={styles.barLabel}>{t(stage.barLabelKey)}</span>}
        </div>
      ))}
    </div>
  );
}
