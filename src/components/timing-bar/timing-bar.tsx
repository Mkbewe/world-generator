import { Flex, Text } from '@radix-ui/themes';

import { formatDuration } from '../../utils/format';
import styles from './timing-bar.module.scss';

const MIN_LABEL_PERCENT = 6;

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
        {visible.map((segment, index) => {
          const percent = (segment.durationMs / total) * 100;
          return (
            <div
              key={segment.key}
              className={styles.timelineSegment}
              data-index={index % 4}
              data-muted={segment.muted}
              style={{ width: `${percent}%` }}
              title={`${segment.label}: ${formatDuration(segment.durationMs)}`}
            >
              {percent >= MIN_LABEL_PERCENT && (
                <span className={styles.timelineLabel}>{Math.round(percent)}%</span>
              )}
            </div>
          );
        })}
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
