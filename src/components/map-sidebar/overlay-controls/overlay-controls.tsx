import { LayersIcon } from '@radix-ui/react-icons';
import { Card, Flex, Switch, Text } from '@radix-ui/themes';

import type { MapOverlayId, MapRendererState } from '../../../utils/map-renderer';
import styles from './overlay-controls.module.scss';

interface OverlayControlsProps {
  preview: MapRendererState;
  onOverlayChange: (id: MapOverlayId, visible: boolean) => void;
  /** Renders without its own card, for use inside a shared panel. */
  bare?: boolean;
}

export function OverlayControls({ preview, onOverlayChange, bare = false }: OverlayControlsProps) {
  const content = (
    <Flex direction='column' gap='3'>
      <Flex align='center' gap='2' className={styles.title}>
        <LayersIcon width={20} height={20} />
        <Text size='3' weight='bold'>
          Overlays
        </Text>
      </Flex>
      {preview.overlays.map(overlay => (
        <Flex key={overlay.id} justify='between' align='center' gap='3'>
          <Text size='2' color={overlay.available ? undefined : 'gray'}>
            {overlay.label}
          </Text>
          <Switch
            checked={overlay.visible}
            disabled={!overlay.available}
            onCheckedChange={visible => onOverlayChange(overlay.id, visible)}
            aria-label={overlay.label}
          />
        </Flex>
      ))}
    </Flex>
  );

  if (bare) {
    return content;
  }

  return (
    <Card size='1' variant='surface' className={styles.overlays}>
      {content}
    </Card>
  );
}
