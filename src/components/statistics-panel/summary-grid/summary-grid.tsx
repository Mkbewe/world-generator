import { useTranslation } from 'react-i18next';
import { Text } from '@radix-ui/themes';

import { InfoLabel } from '../../info-label';
import type { StatisticsMetric } from '../types';
import styles from './summary-grid.module.scss';

interface SummaryGridProps {
  items: readonly StatisticsMetric[];
}

export function SummaryGrid({ items }: SummaryGridProps) {
  const { t } = useTranslation();

  return (
    <div className={styles.summary}>
      {items.map(item => {
        return (
          <div key={item.key} className={styles.summaryItem}>
            <InfoLabel label={t(item.labelKey)} description={t(item.descriptionKey)} />
            <Text size='3' weight='bold'>
              {item.value}
            </Text>
          </div>
        );
      })}
    </div>
  );
}
