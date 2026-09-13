import type { ReactNode } from 'react';
import { Flex, Tabs } from '@radix-ui/themes';

import { MapLayerViews } from './map-layer-views';
import type {
  MapBaseLayerId,
  MapLayerNavigation,
  MapOverlayId,
  MapRendererState,
} from '../../utils/map-renderer';
import { MapOverlayControls } from '../map-overlay-controls';
import styles from './map-layer-controls.module.scss';

interface MapLayerControlsProps {
  preview: MapRendererState;
  navigation: MapLayerNavigation;
  children: ReactNode;
  onBaseLayerChange: (layer: MapBaseLayerId) => void;
  onOverlayChange: (id: MapOverlayId, visible: boolean) => void;
}

export function MapLayerControls({
  preview,
  navigation,
  children,
  onBaseLayerChange,
  onOverlayChange,
}: MapLayerControlsProps) {
  const { tabs, activeTab } = navigation;
  const selectTab = (id: string): void => {
    const tab = tabs.find(tab => tab.id === id);
    if (tab?.available) {
      onBaseLayerChange(tab.selectedLayer);
    }
  };

  return (
    <Flex direction='column' gap='3'>
      <Tabs.Root value={activeTab ?? ''} onValueChange={selectTab}>
        <Tabs.List aria-label='Map layers' className={styles.tabsList}>
          {tabs.map(tab => (
            <Tabs.Trigger
              key={tab.id}
              value={tab.id}
              aria-label={tab.label}
              disabled={!tab.available}
              className={styles.tabTrigger}
            >
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </Tabs.Root>
      <Flex align='stretch' gap='4' className={styles.mapArea}>
        <div className={styles.canvasArea}>{children}</div>
        <Flex direction='column' gap='3' className={styles.sidebar}>
          <MapOverlayControls preview={preview} onOverlayChange={onOverlayChange} />
          <MapLayerViews tabs={tabs} activeTab={activeTab} onViewChange={onBaseLayerChange} />
        </Flex>
      </Flex>
    </Flex>
  );
}
