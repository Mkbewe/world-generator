import { Flex, Text } from '@radix-ui/themes';

import { formatDuration } from '../lib/progress-format';
import type { GenerationProgressState } from '../lib/progress-types';

const STATUS_LABEL: Record<GenerationProgressState['status'], string> = {
  running: 'Generating',
  completed: 'Complete',
  failed: 'Failed',
};

interface ProgressHeaderProps {
  status: GenerationProgressState['status'];
  completed: number;
  total: number;
  skipped: number;
  time: number;
}

export function ProgressHeader({ status, completed, total, skipped, time }: ProgressHeaderProps) {
  const counter =
    skipped > 0 ? `${completed} / ${total}, ${skipped} skipped` : `${completed} / ${total}`;

  return (
    <Flex justify='between' align='center' gap='3'>
      <Text size='2' color={status === 'failed' ? 'red' : 'gray'}>
        {STATUS_LABEL[status]}
      </Text>
      <Flex align='center' gap='3'>
        <Text size='2' color='gray'>
          {counter}
        </Text>
        <Text size='2' weight='bold' color={status === 'failed' ? 'red' : 'violet'}>
          {formatDuration(time)}
        </Text>
      </Flex>
    </Flex>
  );
}
