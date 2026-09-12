import { Text } from '@radix-ui/themes';

import { InfoLabel } from '../../info-label';
import type { StatisticsMetric } from '../types';
import styles from './summary-grid.module.scss';

interface SummaryGridProps {
  items: readonly StatisticsMetric[];
}

export function SummaryGrid({ items }: SummaryGridProps) {
  return (
    <div className={styles.summary}>
      {items.map(item => (
        <div key={item.label} className={styles.summaryItem}>
          <InfoLabel label={item.label} description={item.description} />
          <Text size='3' weight='bold'>
            {item.value}
          </Text>
        </div>
      ))}
    </div>
  );
}
