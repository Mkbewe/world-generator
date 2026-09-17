import { Flex } from '@radix-ui/themes';

import type { GenerationProgressState } from './lib/progress-types';
import { useElapsed } from './lib/use-elapsed';
import { ProgressHeader } from './progress-header';
import { StageBars } from './stage-bars';
import { StageList } from './stage-list';
import styles from './generation-progress.module.scss';

interface GenerationProgressProps {
  progress: GenerationProgressState;
}

export function GenerationProgress({ progress }: GenerationProgressProps) {
  const total = progress.stages.length;
  const completed = progress.stages.filter(stage => stage.status === 'completed').length;
  const elapsed = useElapsed(progress.status, progress.startedAt);
  const time = progress.totalDurationMs ?? elapsed;

  return (
    <Flex
      direction='column'
      gap='2'
      className={styles.root}
      data-status={progress.status}
      aria-live='polite'
    >
      <ProgressHeader status={progress.status} completed={completed} total={total} time={time} />
      <StageBars stages={progress.stages} status={progress.status} />
      <StageList stages={progress.stages} />
    </Flex>
  );
}
