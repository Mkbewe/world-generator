import { Flex, Text } from '@radix-ui/themes';

import { formatDuration } from '../../utils/format';
import styles from './timing-bar.module.scss';

export interface TimingSegment {
  key: string;
  label: string;
  durationMs: number;
  muted?: boolean;
}

interface TimingBarProps {
  segments: readonly TimingSegment[];
}

export function TimingBar({ segments }: TimingBarProps) {
  const visible = segments.filter(segment => segment.durationMs > 0);
  const total = visible.reduce((sum, segment) => sum + segment.durationMs, 0);
  if (visible.length === 0 || total <= 0) {
    return null;
  }

  return (
    <Flex direction='column' gap='2'>
      <Text size='2' weight='bold' color='gray'>
        Timing
      </Text>
      <div className={styles.timeline}>
        {visible.map((segment, index) => (
          <div
            key={segment.key}
            className={styles.timelineSegment}
            data-index={index % 4}
            data-muted={segment.muted}
            style={{ width: `${(segment.durationMs / total) * 100}%` }}
            title={`${segment.label}: ${formatDuration(segment.durationMs)}`}
          />
        ))}
      </div>
      <Flex gap='3' wrap='wrap'>
        {visible.map((segment, index) => (
          <Flex key={segment.key} align='center' gap='1'>
            <span
              className={styles.timelineDot}
              data-index={index % 4}
              data-muted={segment.muted}
            />
            <Text size='2' color='gray'>
              {segment.label} · {formatDuration(segment.durationMs)}
            </Text>
          </Flex>
        ))}
      </Flex>
    </Flex>
  );
}
