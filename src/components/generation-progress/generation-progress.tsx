import { Flex, Progress, Text } from '@radix-ui/themes';

import styles from './generation-progress.module.scss';

export interface GenerationProgressState {
  stageName: string;
  stageIndex: number;
  stageCount: number;
  percentage: number;
  status: 'running' | 'completed' | 'failed';
}

interface GenerationProgressProps {
  progress: GenerationProgressState;
}

export function GenerationProgress({ progress }: GenerationProgressProps) {
  const stageLabel =
    progress.stageCount > 0
      ? `Stage ${progress.stageIndex + 1} of ${progress.stageCount}`
      : undefined;

  return (
    <Flex direction='column' gap='2' className={styles.root} aria-live='polite'>
      <Flex justify='between' align='center' gap='3'>
        <Flex align='center' gap='2'>
          <Text size='2' color={progress.status === 'failed' ? 'red' : 'gray'}>
            {progress.stageName}:
          </Text>
          {stageLabel && (
            <Text size='1' color='gray'>
              {stageLabel}
            </Text>
          )}
        </Flex>
        <Text size='2' weight='bold' color={progress.status === 'failed' ? 'red' : 'violet'}>
          {progress.status === 'failed' ? 'Failed' : `${progress.percentage}%`}
        </Text>
      </Flex>
      <Progress
        value={progress.percentage}
        max={100}
        color={progress.status === 'failed' ? 'red' : 'violet'}
        aria-label={`${progress.stageName} progress`}
      />
    </Flex>
  );
}
