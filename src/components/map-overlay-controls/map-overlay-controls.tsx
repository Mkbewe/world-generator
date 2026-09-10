import { Flex, Switch, Text } from '@radix-ui/themes';

import {
  type AvailablePreviewMapLayers,
  isOverlayAvailable,
  type MapOverlayId,
  OVERLAY_OPTIONS,
} from '../../utils/map-preview';
import styles from './map-overlay-controls.module.scss';

interface MapOverlayControlsProps {
  layers: AvailablePreviewMapLayers;
  overlays: readonly MapOverlayId[];
  onOverlayToggle: (layer: MapOverlayId, checked: boolean) => void;
}

export function MapOverlayControls({ layers, overlays, onOverlayToggle }: MapOverlayControlsProps) {
  return (
    <Flex direction='column' gap='3' className={styles.overlays}>
      <Text size='2' weight='bold' color='gray'>
        Overlays
      </Text>
      {OVERLAY_OPTIONS.map(option => {
        const available = isOverlayAvailable(option.id, layers);
        const checked = overlays.includes(option.id);

        return (
          <Flex key={option.id} justify='between' align='center' gap='3'>
            <Text size='1' color={available ? undefined : 'gray'}>
              {option.label}
            </Text>
            <Switch
              checked={checked}
              disabled={!available}
              aria-label={option.label}
              onCheckedChange={value => onOverlayToggle(option.id, value)}
            />
          </Flex>
        );
      })}
    </Flex>
  );
}
