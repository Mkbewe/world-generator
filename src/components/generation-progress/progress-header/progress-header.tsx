import { useTranslation } from 'react-i18next';
import { Flex, Text } from '@radix-ui/themes';

import type { MessageKey } from '../../../i18n';
import { formatDurationShort } from '../../../utils/format';
import type { ProgressStatus } from '../lib/progress-view-model';

const STATUS_KEYS: Record<ProgressStatus, MessageKey> = {
  running: 'progress.status.running',
  completed: 'progress.status.completed',
  failed: 'progress.status.failed',
};

interface ProgressHeaderProps {
  status: ProgressStatus;
  completed: number;
  total: number;
  skipped: number;
  time: number;
}

export function ProgressHeader({ status, completed, total, skipped, time }: ProgressHeaderProps) {
  const { t } = useTranslation();
  const failed = status === 'failed';
  const counter =
    skipped > 0
      ? t('progress.counterSkipped', { completed, total, skipped })
      : t('progress.counter', { completed, total });

  return (
    <Flex justify='between' align='center' gap='3'>
      <Text size='2' color={failed ? 'red' : 'gray'}>
        {t(STATUS_KEYS[status])}
      </Text>
      <Flex align='center' gap='3'>
        <Text size='2' color='gray'>
          {counter}
        </Text>
        <Text size='2' weight='bold' color={failed ? 'red' : 'violet'}>
          {formatDurationShort(time)}
        </Text>
      </Flex>
    </Flex>
  );
}
