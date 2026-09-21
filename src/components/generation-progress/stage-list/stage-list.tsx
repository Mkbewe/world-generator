import { Text } from '@radix-ui/themes';

import { formatDuration } from '../lib/progress-format';
import type { GenerationStageProgress } from '../lib/progress-types';
import styles from './stage-list.module.scss';

export function StageList({ stages }: { stages: readonly GenerationStageProgress[] }) {
  return (
    <div className={styles.labels}>
      {stages.map(stage => (
        <div key={stage.id} className={styles.label} data-status={stage.status}>
          <Text size='1' className={styles.labelName} title={stage.name}>
            {stage.name}
          </Text>
          {stageTrailing(stage) !== undefined && (
            <Text size='1' className={styles.labelTime}>
              {stageTrailing(stage)}
            </Text>
          )}
        </div>
      ))}
    </div>
  );
}

/** Duration of a stage, or the marker for one that was reused instead of run. */
function stageTrailing(stage: GenerationStageProgress): string | undefined {
  if (stage.status === 'skipped') {
    return 'Skipped';
  }
  if (stage.durationMs === undefined) {
    return undefined;
  }
  return formatDuration(stage.durationMs);
}
