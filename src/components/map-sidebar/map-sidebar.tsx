import { useState } from 'react';
import { Card, Flex, Separator } from '@radix-ui/themes';

import { CursorReadout, type CursorReadoutProps } from './cursor-readout';
import { LayerViews } from './layer-views';
import { OverlayControls } from './overlay-controls';
import { PanelHeader, type PanelPosition } from './panel-header';
import { ViewControls } from './view-controls';
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
  /** Zoom controls rendered above the overlays; only the fullscreen mode can zoom. */
  view?: {
    zoom: number;
    fitted: boolean;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onReset: () => void;
  };
  /** Floats the sidebar over the map; used by the fullscreen mode. */
  expanded?: boolean;
}

export function MapSidebar({
  preview,
  navigation,
  onLayerChange,
  onOverlayChange,
  inspector,
  view,
  expanded = false,
}: MapSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [position, setPosition] = useState<PanelPosition>('middle');
  const { tabs, activeTab } = navigation;

  const divider = expanded ? <Separator size='4' /> : null;
  const rendersViews = tabs.some(tab => (tab.children?.length ?? 0) > 1);
  const sections = (
    <>
      {expanded && view && (
        <>
          <ViewControls {...view} bare />
          {divider}
        </>
      )}
      <OverlayControls preview={preview} onOverlayChange={onOverlayChange} bare={expanded} />
      {rendersViews && (
        <>
          {divider}
          <LayerViews tabs={tabs} activeTab={activeTab} onViewChange={onLayerChange} />
        </>
      )}
      {inspector && (
        <>
          {divider}
          <CursorReadout {...inspector} bare={expanded} />
        </>
      )}
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
