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
      align='center'
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
        <Text key={item.id} size='1' color='gray'>
          <span className={styles.label}>{item.label}:</span>{' '}
          <span className={styles.value}>{item.value}</span>
        </Text>
      ))}
    </Flex>
  );
}
