import type { ReactNode } from 'react';
import { Flex, Heading, Separator, Tabs, Tooltip } from '@radix-ui/themes';

import styles from './vertical-tabs.module.scss';

export interface VerticalTabItem {
  value: string;
  /** Used as the tooltip text and the trigger's accessible name. */
  label: string;
  icon: ReactNode;
  content: ReactNode;
}

export interface VerticalTabsProps {
  items: readonly VerticalTabItem[];
  /** Accessible name of the tab strip. */
  ariaLabel?: string;
  defaultValue?: string;
  /** Pass together with `onValueChange` to control the active tab. */
  value?: string;
  onValueChange?: (value: string) => void;
  /** Which edge the icon strip sits on. */
  side?: 'left' | 'right';
}

export function VerticalTabs({
  items,
  ariaLabel = 'Sections',
  defaultValue,
  value,
  onValueChange,
  side = 'left',
}: VerticalTabsProps) {
  return (
    <Tabs.Root
      className={styles.root}
      data-side={side}
      orientation='vertical'
      value={value}
      defaultValue={defaultValue ?? items[0]?.value}
      onValueChange={onValueChange}
    >
      <Tabs.List className={styles.list} aria-label={ariaLabel}>
        {items.map(item => (
          <Tabs.Trigger
            key={item.value}
            value={item.value}
            className={styles.trigger}
            aria-label={item.label}
            tabIndex={0}
          >
            <Tooltip content={item.label} delayDuration={500}>
              <span className={styles.iconWrapper}>{item.icon}</span>
            </Tooltip>
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      {items.map(item => (
        <Tabs.Content key={item.value} value={item.value} className={styles.content}>
          <Flex direction='column' gap='3'>
            <Heading size='4' color='violet'>
              {item.label}
            </Heading>
            <Separator size='4' />
            {item.content}
          </Flex>
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
