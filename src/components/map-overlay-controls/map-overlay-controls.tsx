import { LayersIcon } from '@radix-ui/react-icons';
import { Card, Flex, Switch, Text } from '@radix-ui/themes';

import type { MapOverlayId, MapRendererState } from '../../utils/map-renderer';
import styles from './map-overlay-controls.module.scss';

interface MapOverlayControlsProps {
  preview: MapRendererState;
  onOverlayChange: (id: MapOverlayId, visible: boolean) => void;
}

export function MapOverlayControls({ preview, onOverlayChange }: MapOverlayControlsProps) {
  return (
    <Card size='1' variant='surface' className={styles.overlays}>
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
    </Card>
  );
}
