import { Card, Flex, Heading, Separator, Text } from '@radix-ui/themes';

import { StatSection } from './stat-section';
import { SummaryGrid } from './summary-grid';
import type { StatisticsMetric, StatisticsSection } from './types';
import { TimingBar, type TimingSegment } from '../timing-bar';
import styles from './statistics-panel.module.scss';

interface StatisticsPanelProps {
  title: string;
  summary?: readonly StatisticsMetric[];
  timing?: readonly TimingSegment[];
  timingNote?: string;
  sections?: readonly StatisticsSection[];
}

export function StatisticsPanel({
  title,
  summary = [],
  timing = [],
  timingNote,
  sections = [],
}: StatisticsPanelProps) {
  return (
    <Card size={{ initial: '2', sm: '3' }} className={styles.root}>
      <Flex direction='column' gap='4'>
        <Heading size='5' color='violet'>
          {title}
        </Heading>
        <Separator size='4' />
        {summary.length > 0 && <SummaryGrid items={summary} />}
        <TimingBar segments={timing} />
        {timingNote && (
          <Text size='1' color='gray'>
            {timingNote}
          </Text>
        )}
        {sections.length > 0 && (
          <Flex direction='column' gap='3'>
            {sections.map(section => (
              <StatSection key={section.key} section={section} />
            ))}
          </Flex>
        )}
      </Flex>
    </Card>
  );
}
