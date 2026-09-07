import type { ReactNode } from 'react';
import { Flex, Tabs } from '@radix-ui/themes';

import {
  BASE_LAYER_OPTIONS,
  isBaseLayerAvailable,
  type MapBaseLayerId,
  type MapOverlayId,
  type PreviewMapLayers,
} from './map-layers';
import { MapOverlayControls } from './map-overlay-controls';
import styles from './map-layer-controls.module.scss';

interface MapLayerControlsProps {
  layers: PreviewMapLayers;
  baseLayer: MapBaseLayerId;
  overlays: readonly MapOverlayId[];
  children: ReactNode;
  onBaseLayerChange: (layer: MapBaseLayerId) => void;
  onOverlayToggle: (layer: MapOverlayId, checked: boolean) => void;
}

export function MapLayerControls({
  layers,
  baseLayer,
  overlays,
  children,
  onBaseLayerChange,
  onOverlayToggle,
}: MapLayerControlsProps) {
  return (
    <Flex direction='column' gap='3'>
      <Tabs.Root
        value={baseLayer}
        onValueChange={value => onBaseLayerChange(value as MapBaseLayerId)}
      >
        <Tabs.List aria-label='Map layers' className={styles.tabsList}>
          {BASE_LAYER_OPTIONS.map(option => (
            <Tabs.Trigger
              key={option.id}
              value={option.id}
              disabled={!isBaseLayerAvailable(option.id, layers)}
              className={styles.tabTrigger}
            >
              {option.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </Tabs.Root>

      <Flex align='stretch' gap='4' className={styles.mapArea}>
        <div className={styles.canvasArea}>{children}</div>
        <MapOverlayControls layers={layers} overlays={overlays} onOverlayToggle={onOverlayToggle} />
      </Flex>
    </Flex>
  );
}
