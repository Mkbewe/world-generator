import type { ReactNode } from 'react';
import { Flex, Tabs } from '@radix-ui/themes';

import type { MapBaseLayerId, MapOverlayId, MapRendererState } from '../../utils/map-renderer';
import { MapOverlayControls } from '../map-overlay-controls';
import styles from './map-layer-controls.module.scss';

interface MapLayerControlsProps {
  preview: MapRendererState;
  children: ReactNode;
  onBaseLayerChange: (layer: MapBaseLayerId) => void;
  onOverlayChange: (id: MapOverlayId, visible: boolean) => void;
}

export function MapLayerControls({
  preview,
  children,
  onBaseLayerChange,
  onOverlayChange,
}: MapLayerControlsProps) {
  return (
    <Flex direction='column' gap='3'>
      <Tabs.Root
        value={preview.displayedLayer ?? ''}
        onValueChange={value => onBaseLayerChange(value as MapBaseLayerId)}
      >
        <Tabs.List aria-label='Map layers' className={styles.tabsList}>
          {preview.layers.map(layer => (
            <Tabs.Trigger
              key={layer.id}
              value={layer.id}
              disabled={!layer.available}
              className={styles.tabTrigger}
            >
              {layer.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </Tabs.Root>
      <Flex align='stretch' gap='4' className={styles.mapArea}>
        <div className={styles.canvasArea}>{children}</div>
        <MapOverlayControls preview={preview} onOverlayChange={onOverlayChange} />
      </Flex>
    </Flex>
  );
}
