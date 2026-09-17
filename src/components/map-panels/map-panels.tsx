import { useState } from 'react';
import { Card, Flex } from '@radix-ui/themes';

import { MapLayerViews } from './map-layer-views';
import { type PanelPosition, PanelsHeader } from './panels-header';
import type {
  MapBaseLayerId,
  MapLayerNavigation,
  MapOverlayId,
  MapRendererState,
} from '../../utils/map-renderer';
import { MapInspector, type MapInspectorProps } from '../map-inspector';
import { MapOverlayControls } from '../map-overlay-controls';
import styles from './map-panels.module.scss';

interface MapPanelsProps {
  preview: MapRendererState;
  navigation: MapLayerNavigation;
  onBaseLayerChange: (layer: MapBaseLayerId) => void;
  onOverlayChange: (id: MapOverlayId, visible: boolean) => void;
  /** Cursor readout rendered below the layer sections. */
  inspector?: MapInspectorProps;
  /** Floats the panels over the map; used by the fullscreen mode. */
  expanded?: boolean;
}

export function MapPanels({
  preview,
  navigation,
  onBaseLayerChange,
  onOverlayChange,
  inspector,
  expanded = false,
}: MapPanelsProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [position, setPosition] = useState<PanelPosition>('middle');
  const { tabs, activeTab } = navigation;

  const sections = (
    <>
      <MapOverlayControls preview={preview} onOverlayChange={onOverlayChange} bare={expanded} />
      <MapLayerViews tabs={tabs} activeTab={activeTab} onViewChange={onBaseLayerChange} />
      {inspector && <MapInspector {...inspector} bare={expanded} />}
    </>
  );

  if (!expanded) {
    return (
      <Flex direction='column' gap='3' className={styles.sidebar}>
        {sections}
      </Flex>
    );
  }

  return (
    <Card
      size='2'
      variant='surface'
      className={styles.panel}
      data-position={position}
      data-collapsed={collapsed || undefined}
    >
      <Flex direction='column' gap='3'>
        <PanelsHeader
          collapsed={collapsed}
          position={position}
          onPositionChange={setPosition}
          onCollapsedChange={setCollapsed}
        />
        {!collapsed && sections}
      </Flex>
    </Card>
  );
}
