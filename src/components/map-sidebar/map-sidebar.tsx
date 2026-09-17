import { useState } from 'react';
import { Card, Flex } from '@radix-ui/themes';

import { CursorReadout, type CursorReadoutProps } from './cursor-readout';
import { LayerViews } from './layer-views';
import { OverlayControls } from './overlay-controls';
import { PanelHeader, type PanelPosition } from './panel-header';
import type {
  MapBaseLayerId,
  MapLayerNavigation,
  MapOverlayId,
  MapRendererState,
} from '../../utils/map-renderer';
import styles from './map-sidebar.module.scss';

interface MapSidebarProps {
  preview: MapRendererState;
  navigation: MapLayerNavigation;
  onLayerChange: (layer: MapBaseLayerId) => void;
  onOverlayChange: (id: MapOverlayId, visible: boolean) => void;
  /** Cursor readout rendered below the layer sections. */
  inspector?: CursorReadoutProps;
  /** Floats the sidebar over the map; used by the fullscreen mode. */
  expanded?: boolean;
}

export function MapSidebar({
  preview,
  navigation,
  onLayerChange,
  onOverlayChange,
  inspector,
  expanded = false,
}: MapSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [position, setPosition] = useState<PanelPosition>('middle');
  const { tabs, activeTab } = navigation;

  const sections = (
    <>
      <OverlayControls preview={preview} onOverlayChange={onOverlayChange} bare={expanded} />
      <LayerViews tabs={tabs} activeTab={activeTab} onViewChange={onLayerChange} />
      {inspector && <CursorReadout {...inspector} bare={expanded} />}
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
        <PanelHeader
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
