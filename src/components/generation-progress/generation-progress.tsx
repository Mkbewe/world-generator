import { useEffect, useState } from 'react';
import { Flex, Text } from '@radix-ui/themes';

import styles from './generation-progress.module.scss';

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

interface GenerationProgressProps {
  progress: GenerationProgressState;
}

const STATUS_LABEL: Record<GenerationProgressState['status'], string> = {
  running: 'Generating',
  completed: 'Complete',
  failed: 'Failed',
};

export function GenerationProgress({ progress }: GenerationProgressProps) {
  const total = progress.stages.length;
  const completed = progress.stages.filter(stage => stage.status === 'completed').length;
  const elapsed = useElapsed(progress.status);
  const time = progress.totalDurationMs ?? elapsed;

  return (
    <Flex
      direction='column'
      gap='2'
      className={styles.root}
      data-status={progress.status}
      aria-live='polite'
    >
      <Flex justify='between' align='center' gap='3'>
        <Text size='2' color={progress.status === 'failed' ? 'red' : 'gray'}>
          {STATUS_LABEL[progress.status]}
        </Text>
        <Flex align='center' gap='3'>
          <Text size='2' color='gray'>
            {completed} / {total}
          </Text>
          <Text size='2' weight='bold' color={progress.status === 'failed' ? 'red' : 'violet'}>
            {formatDuration(time)}
          </Text>
        </Flex>
      </Flex>
      <div className={styles.bars}>
        {progress.stages.map(stage => {
          const width =
            stage.status === 'pending'
              ? '0%'
              : stage.status === 'running'
                ? `${stage.percentage}%`
                : '100%';
          return (
            <div key={stage.id} className={styles.bar} data-status={stage.status}>
              <div className={styles.barFill} style={{ width }} />
            </div>
          );
        })}
      </div>
      <div className={styles.labels}>
        {progress.stages.map(stage => (
          <div key={stage.id} className={styles.label} data-status={stage.status}>
            <Text size='1' className={styles.labelName} title={stage.name}>
              {stage.name}
            </Text>
            {stage.durationMs !== undefined && (
              <Text size='1' className={styles.labelTime}>
                {formatDuration(stage.durationMs)}
              </Text>
            )}
          </div>
        ))}
      </div>
    </Flex>
  );
}

function useElapsed(status: GenerationProgressState['status']): number {
  const [startedAt] = useState(() => performance.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (status !== 'running') {
      return;
    }
    const id = setInterval(() => setElapsed(performance.now() - startedAt), 100);
    return () => clearInterval(id);
  }, [status, startedAt]);

  return elapsed;
}

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)} ms`;
  }
  return `${(ms / 1000).toFixed(1)} s`;
}
