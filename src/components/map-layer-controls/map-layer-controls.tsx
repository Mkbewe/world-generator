import type { ReactNode } from 'react';
import { FrameIcon, GlobeIcon, LayersIcon, MixerHorizontalIcon } from '@radix-ui/react-icons';
import { Flex, Tabs } from '@radix-ui/themes';

import type {
  MapBaseLayerId,
  MapLayerNavigation,
  MapOverlayId,
  MapRendererState,
} from '../../utils/map-renderer';
import type { MapInspectorProps } from '../map-inspector';
import { MapPanels } from '../map-panels';
import styles from './map-layer-controls.module.scss';

const LAYER_ICONS: Record<string, ReactNode> = {
  'world-shape': <GlobeIcon />,
  'macro-region': <LayersIcon />,
  noise: <MixerHorizontalIcon />,
};

interface MapLayerControlsProps {
  preview: MapRendererState;
  navigation: MapLayerNavigation;
  children: ReactNode;
  onBaseLayerChange: (layer: MapBaseLayerId) => void;
  onOverlayChange: (id: MapOverlayId, visible: boolean) => void;
  /** Cursor readout rendered in the panels; needs the preview readout data. */
  inspector?: MapInspectorProps;
  /** Stretches the map area to the available height, used by the fullscreen mode. */
  expanded?: boolean;
}

export function MapLayerControls({
  preview,
  navigation,
  children,
  onBaseLayerChange,
  onOverlayChange,
  inspector,
  expanded = false,
}: MapLayerControlsProps) {
  const { tabs, activeTab } = navigation;
  const selectTab = (id: string): void => {
    const tab = tabs.find(tab => tab.id === id);
    if (tab?.available) {
      onBaseLayerChange(tab.selectedLayer);
    }
  };

  return (
    <Flex direction='column' gap='3' className={expanded ? styles.expanded : undefined}>
      <Flex align='stretch' gap='3' className={styles.mapArea}>
        <Tabs.Root
          orientation='vertical'
          value={activeTab ?? ''}
          onValueChange={selectTab}
          className={styles.layerTabs}
        >
          <Tabs.List aria-label='Map layers' className={styles.layerStrip}>
            {tabs.map(tab => (
              <Tabs.Trigger
                key={tab.id}
                value={tab.id}
                aria-label={tab.label}
                title={tab.label}
                disabled={!tab.available}
                className={styles.layerTrigger}
              >
                <span className={styles.layerIcon}>{LAYER_ICONS[tab.id] ?? <FrameIcon />}</span>
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </Tabs.Root>
        <div className={styles.canvasArea}>{children}</div>
        <div className={styles.spacer} aria-hidden='true' />
        <MapPanels
          preview={preview}
          navigation={navigation}
          onBaseLayerChange={onBaseLayerChange}
          onOverlayChange={onOverlayChange}
          inspector={inspector}
          expanded={expanded}
        />
      </Flex>
    </Flex>
  );
}
