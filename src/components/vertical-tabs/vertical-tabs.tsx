import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Flex, Heading, Separator, Tabs, Tooltip } from '@radix-ui/themes';

import styles from './vertical-tabs.module.scss';

export interface VerticalTabItem<TValue extends string = string> {
  value: TValue;
  /** Used as the tooltip text and the trigger's accessible name. */
  label: string;
  icon: ReactNode;
  content: ReactNode;
}

export interface VerticalTabsProps<TValue extends string = string> {
  items: readonly VerticalTabItem<TValue>[];
  /** Accessible name of the tab strip. */
  ariaLabel?: string;
  defaultValue?: TValue;
  /** Pass together with `onValueChange` to control the active tab. */
  value?: TValue;
  onValueChange?: (value: TValue) => void;
  /** Which edge the icon strip sits on. */
  side?: 'left' | 'right';
}

export function VerticalTabs<TValue extends string = string>({
  items,
  ariaLabel,
  defaultValue,
  value,
  onValueChange,
  side = 'left',
}: VerticalTabsProps<TValue>) {
  const { t } = useTranslation();
  const label = ariaLabel ?? t('common.sections');
  const handleValueChange = (next: string): void => {
    const item = items.find(item => item.value === next);
    if (item) {
      onValueChange?.(item.value);
    }
  };

  return (
    <Tabs.Root
      className={styles.root}
      data-side={side}
      orientation='vertical'
      value={value}
      defaultValue={defaultValue ?? items[0]?.value}
      onValueChange={handleValueChange}
    >
      <Tabs.List className={styles.list} aria-label={label}>
        {items.map(item => (
          <Tabs.Trigger
            key={item.value}
            value={item.value}
            className={styles.trigger}
            aria-label={item.label}
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
