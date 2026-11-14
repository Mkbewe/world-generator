import { Flex } from '@radix-ui/themes';

import { useElapsed } from './hooks/use-elapsed';
import { type ProgressViewModel } from './lib/progress-view-model';
import { ProgressHeader } from './progress-header';
import { StageBars } from './stage-bars';
import { StageList } from './stage-list';
import styles from './generation-progress.module.scss';

interface GenerationProgressProps {
  model: ProgressViewModel;
}

export function GenerationProgress({ model }: GenerationProgressProps) {
  const elapsed = useElapsed(model.status, model.startedAt);
  const time = model.totalDurationMs ?? elapsed;

  return (
    <Flex
      direction='column'
      gap='2'
      className={styles.root}
      data-status={model.status}
      aria-live='polite'
    >
      <ProgressHeader
        status={model.status}
        completed={model.completed}
        total={model.total}
        skipped={model.skipped}
        time={time}
      />
      <StageBars stages={model.stages} complete={model.status === 'completed'} />
      <StageList stages={model.stages} />
    </Flex>
  );
}
