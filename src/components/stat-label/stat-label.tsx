import { QuestionMarkCircledIcon } from '@radix-ui/react-icons';
import { Flex, Text, Tooltip } from '@radix-ui/themes';

import styles from './stat-label.module.scss';

interface StatLabelProps {
  label: string;
  description: string;
}

export function StatLabel({ label, description }: StatLabelProps) {
  return (
    <Flex align='center' gap='1'>
      <Text size='2' color='gray'>
        {label}
      </Text>
      {description && (
        <Tooltip content={description} delayDuration={200}>
          <span className={styles.help}>
            <QuestionMarkCircledIcon />
          </span>
        </Tooltip>
      )}
    </Flex>
  );
}
