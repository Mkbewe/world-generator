import { Flex, Text } from '@radix-ui/themes';

import { StatLabel } from '../../stat-label';
import type { StatisticsSection } from '../types';
import styles from './stat-section.module.scss';

interface StatSectionProps {
  section: StatisticsSection;
}

export function StatSection({ section }: StatSectionProps) {
  return (
    <div className={styles.section}>
      <Flex justify='between' align='center' gap='3'>
        <Text size='2' weight='bold'>
          {section.title}
        </Text>
        {section.trailing && (
          <Text size='2' color='gray'>
            {section.trailing}
          </Text>
        )}
      </Flex>
      {section.metrics.length > 0 && (
        <div className={styles.metrics}>
          {section.metrics.map(metric => (
            <div key={metric.label} className={styles.metric}>
              <StatLabel label={metric.label} description={metric.description} />
              <Text size='2'>{metric.value}</Text>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
