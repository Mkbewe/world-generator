import { useTranslation } from 'react-i18next';
import { Flex, Text } from '@radix-ui/themes';

import { formatDuration } from '../../../utils/format';
import { InfoLabel } from '../../info-label';
import type { StatisticsSection } from '../types';
import styles from './stat-section.module.scss';

interface StatSectionProps {
  section: StatisticsSection;
}

function formatTrailing(section: StatisticsSection, reusedLabel: string): string {
  const formatted = formatDuration(section.durationMs);
  if (!section.reused) {
    return formatted;
  }
  return section.durationMs > 0 ? `${formatted} · ${reusedLabel}` : reusedLabel;
}

export function StatSection({ section }: StatSectionProps) {
  const { t } = useTranslation();
  const trailing = formatTrailing(section, t('common.reused'));

  return (
    <div className={styles.section}>
      <Flex justify='between' align='center' gap='3'>
        <Text size='2' weight='bold'>
          {t(section.titleKey)}
        </Text>
        <Text size='2' color='gray'>
          {trailing}
        </Text>
      </Flex>
      {section.metrics.length > 0 && (
        <div className={styles.metrics}>
          {section.metrics.map(metric => {
            return (
              <div key={metric.key} className={styles.metric}>
                <InfoLabel label={t(metric.labelKey)} description={t(metric.descriptionKey)} />
                <Text size='2'>{metric.value}</Text>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
