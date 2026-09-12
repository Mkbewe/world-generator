import { Text } from '@radix-ui/themes';

import { StatLabel } from '../../stat-label';
import type { StatisticsSummaryItem } from '../types';
import styles from './summary-grid.module.scss';

interface SummaryGridProps {
  items: readonly StatisticsSummaryItem[];
}

export function SummaryGrid({ items }: SummaryGridProps) {
  return (
    <div className={styles.summary}>
      {items.map(item => (
        <div key={item.label} className={styles.summaryItem}>
          <StatLabel label={item.label} description={item.description} />
          <Text size='3' weight='bold'>
            {item.value}
          </Text>
        </div>
      ))}
    </div>
  );
}
