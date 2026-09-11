import { Flex, Switch, Text } from '@radix-ui/themes';

import type { MapOverlayId, MapRendererState } from '../../utils/map-renderer';
import styles from './map-overlay-controls.module.scss';

interface MapOverlayControlsProps {
  preview: MapRendererState;
  onOverlayChange: (id: MapOverlayId, visible: boolean) => void;
}

export function MapOverlayControls({ preview, onOverlayChange }: MapOverlayControlsProps) {
  return (
    <Flex direction='column' gap='3' className={styles.overlays}>
      <Text size='2' weight='bold' color='gray'>
        Overlays
      </Text>
      {preview.overlays.map(overlay => (
        <Flex key={overlay.id} justify='between' align='center' gap='3'>
          <Text size='1' color={overlay.available ? undefined : 'gray'}>
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
}
