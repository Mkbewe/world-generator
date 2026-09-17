import type { ReactNode } from 'react';
import { DrawingPinFilledIcon } from '@radix-ui/react-icons';
import { Card, Flex, Text } from '@radix-ui/themes';

import type { ReadoutItem } from '../preview-map/readout';
import styles from './map-inspector.module.scss';

export interface MapInspectorProps {
  items: readonly ReadoutItem[];
  pinned?: boolean;
  /** Renders without its own card, for use inside a shared panel. */
  bare?: boolean;
}

/** A card with the hovered cell and layer value, pinned to the sidebar footer. */
export function MapInspector({ items, pinned = false, bare = false }: MapInspectorProps) {
  const content = (
    <Flex
      align='start'
      gap='4'
      wrap='wrap'
      className={pinned ? `${styles.inspector} ${styles.pinned}` : styles.inspector}
      role='group'
      aria-label={pinned ? 'Cursor readout (pinned)' : 'Cursor readout'}
      data-testid='map-inspector'
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
    return item.lines.flatMap(line => [
      <span key={`${line.label}-label`} className={styles.label}>
        {line.label}:
      </span>,
      <span key={`${line.label}-x`} className={styles.value}>
        {line.x}
      </span>,
      <span key={`${line.label}-y`} className={styles.value}>
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
