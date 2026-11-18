import { useTranslation } from 'react-i18next';
import { Text } from '@radix-ui/themes';
import type { TFunction } from 'i18next';

import { formatDurationShort } from '../../../../utils/format';
import type { ProgressStageViewModel } from '../lib/progress-view-model';
import styles from './stage-list.module.scss';

export function StageList({ stages }: { stages: readonly ProgressStageViewModel[] }) {
  return (
    <div className={styles.labels}>
      {stages.map((stage, index) => (
        <StageLabel key={stage.id} stage={stage} index={index} />
      ))}
    </div>
  );
}

function StageLabel({ stage, index }: { stage: ProgressStageViewModel; index: number }) {
  const { t } = useTranslation();
  const trailing = stageTrailing(stage, t);

  return (
    <div
      className={styles.label}
      data-status={stage.status}
      aria-current={stage.status === 'running' ? 'step' : undefined}
    >
      <div className={styles.labelHeading}>
        <span className={styles.labelIndex} aria-hidden='true'>
          {index + 1}.
        </span>
        <Text size='1' className={styles.labelName}>
          {t(stage.nameKey)}
        </Text>
      </div>
      {trailing !== undefined && (
        <Text size='1' className={styles.labelTime}>
          {trailing}
        </Text>
      )}
    </div>
  );
}

function stageTrailing(stage: ProgressStageViewModel, t: TFunction): string | undefined {
  if (stage.trailing?.kind === 'skipped') {
    return t('progress.stage.skipped');
  }
  if (stage.trailing?.kind === 'duration') {
    return formatDurationShort(stage.trailing.durationMs);
  }
  return undefined;
}
