import type { ReactNode } from 'react';
import { DrawingPinFilledIcon } from '@radix-ui/react-icons';
import { Card, Flex, Text } from '@radix-ui/themes';

import type { ReadoutItem } from '../../../utils/map-readout';
import styles from './cursor-readout.module.scss';

export interface CursorReadoutProps {
  items: readonly ReadoutItem[];
  pinned?: boolean;
  /** Renders without its own card, for use inside a shared panel. */
  bare?: boolean;
}

/** A card with the hovered cell and layer value, pinned to the sidebar footer. */
export function CursorReadout({ items, pinned = false, bare = false }: CursorReadoutProps) {
  const content = (
    <Flex
      align='start'
      gap='4'
      wrap='wrap'
      className={pinned ? `${styles.inspector} ${styles.pinned}` : styles.inspector}
      role='group'
      aria-label={pinned ? 'Cursor readout (pinned)' : 'Cursor readout'}
    >
      {pinned && (
        <span className={styles.pin} title='Pinned' aria-hidden>
          <DrawingPinFilledIcon />
        </span>
      )}
      {items.map(item => (
        <Text
          key={item.id}
          size='1'
          color='gray'
          as='span'
          className={item.lines ? `${styles.item} ${styles.axes}` : styles.item}
        >
          {renderItemContent(item)}
        </Text>
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

function renderItemContent(item: ReadoutItem): ReactNode {
  if (item.lines) {
    return item.lines.flatMap((line, index) => [
      <span key={`line-${index}-label`} className={styles.label}>
        {line.label}:
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
      <span className={styles.label}>{item.label}:</span>
      <span className={styles.value}>{item.value}</span>
    </>
  );
}
