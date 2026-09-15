import { DrawingPinFilledIcon } from '@radix-ui/react-icons';
import { Flex, Text } from '@radix-ui/themes';

import type { ReadoutItem } from './readout';
import styles from './map-inspector.module.scss';

interface MapInspectorProps {
  items: readonly ReadoutItem[];
  pinned?: boolean;
}

/** A fixed readout bar below the preview; never overlays the map. */
export function MapInspector({ items, pinned = false }: MapInspectorProps) {
  return (
    <Flex
      align='start'
      gap='4'
      wrap='wrap'
      className={styles.inspector}
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
          {item.lines ? (
            item.lines.flatMap(line => [
              <span key={`${line.label}-label`} className={styles.label}>
                {line.label}:
              </span>,
              <span key={`${line.label}-x`} className={styles.value}>
                {line.x}
              </span>,
              <span key={`${line.label}-y`} className={styles.value}>
                {line.y}
              </span>,
            ])
          ) : (
            <>
              <span className={styles.label}>{item.label}:</span>
              <span className={styles.value}>{item.value}</span>
            </>
          )}
        </Text>
      ))}
    </Flex>
  );
}
