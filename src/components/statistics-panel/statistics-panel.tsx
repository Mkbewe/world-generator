import { useTranslation } from 'react-i18next';
import { Card, Flex, Heading, Separator, Text } from '@radix-ui/themes';

import { StatSection } from './stat-section';
import { SummaryGrid } from './summary-grid';
import type { StatisticsViewModel } from './types';
import { formatDuration } from '../../utils/format';
import { TimingBar } from '../timing-bar';
import styles from './statistics-panel.module.scss';

export interface StatisticsPanelProps {
  model: StatisticsViewModel;
}

export function StatisticsPanel({ model }: StatisticsPanelProps) {
  const { t } = useTranslation();
  const timingNote =
    model.unmeasuredDurationMs !== undefined && model.unmeasuredDurationMs > 0
      ? t('statistics.additionalTime', { duration: formatDuration(model.unmeasuredDurationMs) })
      : undefined;

  return (
    <Card size={{ initial: '2', sm: '3' }} className={styles.root}>
      <Flex direction='column' gap='4'>
        <Heading size='5' color='violet'>
          {t(model.titleKey)}
        </Heading>
        <Separator size='4' />
        {model.summary.length > 0 && <SummaryGrid items={model.summary} />}
        {model.timing.length > 0 && <TimingBar segments={model.timing} />}
        {timingNote && (
          <Text size='1' color='gray'>
            {timingNote}
          </Text>
        )}
        {model.sections.length > 0 && (
          <Flex direction='column' gap='3'>
            {model.sections.map(section => (
              <StatSection key={section.key} section={section} />
            ))}
          </Flex>
        )}
      </Flex>
    </Card>
  );
}
