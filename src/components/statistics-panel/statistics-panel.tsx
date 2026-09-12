import { Card, Flex, Heading, Separator } from '@radix-ui/themes';

import { StatSection } from './stat-section';
import { SummaryGrid } from './summary-grid';
import type { StatisticsSection, StatisticsSummaryItem } from './types';
import { TimingBar, type TimingSegment } from '../timing-bar';
import styles from './statistics-panel.module.scss';

interface StatisticsPanelProps {
  title: string;
  summary?: readonly StatisticsSummaryItem[];
  timing?: readonly TimingSegment[];
  sections?: readonly StatisticsSection[];
}

export function StatisticsPanel({
  title,
  summary = [],
  timing = [],
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
