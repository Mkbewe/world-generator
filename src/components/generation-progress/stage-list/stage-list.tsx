import { useTranslation } from 'react-i18next';
import { Text } from '@radix-ui/themes';

import type { GenerationStageProgress } from '../../../stores';
import { formatDurationShort } from '../../../utils/format';
import styles from './stage-list.module.scss';

export function StageList({ stages }: { stages: readonly GenerationStageProgress[] }) {
  const { t } = useTranslation();

  return (
    <div className={styles.labels}>
      {stages.map(stage => (
        <div key={stage.id} className={styles.label} data-status={stage.status}>
          <Text size='1' className={styles.labelName} title={t(stage.nameKey)}>
            {t(stage.nameKey)}
          </Text>
          {stageTrailing(stage, t('stages.skipped')) !== undefined && (
            <Text size='1' className={styles.labelTime}>
              {stageTrailing(stage, t('stages.skipped'))}
            </Text>
          )}
        </div>
      ))}
    </div>
  );
}

/** Duration of a stage, or the marker for one that was reused instead of run. */
function stageTrailing(stage: GenerationStageProgress, skippedLabel: string): string | undefined {
  if (stage.status === 'skipped') {
    return skippedLabel;
  }
  if (stage.durationMs === undefined) {
    return undefined;
  }
  return formatDurationShort(stage.durationMs);
}
