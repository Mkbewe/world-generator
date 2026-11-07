import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { DrawingPinFilledIcon } from '@radix-ui/react-icons';
import { Button, Card, Flex, Text } from '@radix-ui/themes';
import type { TFunction } from 'i18next';

import type { ReadoutItem } from '../../../utils/map-readout';
import styles from './cursor-readout.module.scss';

export interface CursorReadoutProps {
  items: readonly ReadoutItem[];
  pinned?: boolean;
  /** Called with the action id when a button entry is pressed. */
  onAction?: (actionId: string) => void;
  /** Renders without its own card, for use inside a shared panel. */
  bare?: boolean;
}

/** A card with the hovered cell and layer value, pinned to the sidebar footer. */
export function CursorReadout({
  items,
  pinned = false,
  onAction,
  bare = false,
}: CursorReadoutProps) {
  const { t } = useTranslation();
  const content = (
    <Flex
      align='start'
      direction='column'
      gap='0'
      className={pinned ? `${styles.inspector} ${styles.pinned}` : styles.inspector}
      role='group'
      aria-label={t(pinned ? 'cursorReadout.pinned' : 'cursorReadout.label')}
    >
      {pinned && (
        <span className={styles.pin} title={t('cursorReadout.pinTitle')} aria-hidden>
          <DrawingPinFilledIcon />
        </span>
      )}
      {items.map(item => (
        <ReadoutEntry key={item.id} item={item} onAction={onAction} />
      ))}
    </Flex>
  );

  if (bare) {
    return content;
  }

  return (
    <Card size='1' variant='surface' className={styles.card}>
      {content}
    </Card>
  );
}

interface ReadoutEntryProps {
  item: ReadoutItem;
  onAction?: (actionId: string) => void;
}

function ReadoutEntry({ item, onAction }: ReadoutEntryProps) {
  const { t } = useTranslation();
  const action = item.action;
  if (item.heading) {
    return (
      <Text
        size='1'
        weight='bold'
        color='gray'
        as='span'
        className={[styles.heading, item.detached ? styles.detached : ''].filter(Boolean).join(' ')}
      >
        {t(item.labelKey)}
      </Text>
    );
  }
  if (action) {
    const label = t(action.labelKey);
    return (
      <div className={styles.action}>
        <Button size='1' variant='soft' onClick={() => onAction?.(action.id)} aria-label={label}>
          {label}
        </Button>
      </div>
    );
  }
  const className = [
    styles.item,
    item.lines ? styles.axes : '',
    item.separated ? styles.separated : '',
    item.detached ? styles.detached : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <Text size='1' color='gray' as='span' className={className}>
      {renderItemContent(item, t)}
    </Text>
  );
}

function valueText(value: ReadoutItem['value'], t: TFunction): string {
  if (value === undefined || typeof value === 'string') {
    return value ?? '';
  }
  const params = Object.fromEntries(
    Object.entries(value.params ?? {}).map(([name, param]) => [
      name,
      typeof param === 'object' ? t(param.key) : param,
    ])
  );
  return t(value.key, params);
}

function renderItemContent(item: ReadoutItem, t: TFunction): ReactNode {
  if (item.lines) {
    return item.lines.flatMap((line, index) => [
      <span key={`line-${index}-label`} className={styles.label}>
        {line.labelKey === undefined ? '' : `${t(line.labelKey)}:`}
      </span>,
      <span key={`line-${index}-x`} className={styles.value}>
        {line.x}
      </span>,
      <span key={`line-${index}-y`} className={styles.value}>
        {line.y}
      </span>,
    ]);
  }

  return (
    <>
      <span className={styles.label}>{t(item.labelKey)}:</span>
      <span className={styles.value}>{valueText(item.value, t)}</span>
    </>
  );
}
