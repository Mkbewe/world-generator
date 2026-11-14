import { type ReactNode, useState } from 'react';
import { Card, Flex, Separator } from '@radix-ui/themes';

import { FullscreenControl, type FullscreenControlProps } from './fullscreen-control';
import { LayerViews } from './layer-views';
import { OverlayControls } from './overlay-controls';
import { PanelHeader, type PanelPosition } from './panel-header';
import { ToolBar, type ToolBarProps } from './tool-bar';
import { ViewControls, type ViewControlsProps } from './view-controls';
import type {
  MapBaseLayerId,
  MapLayerNavigation,
  MapOverlayId,
  MapRendererState,
} from '../../../../utils/map-renderer';
import styles from './map-sidebar.module.scss';

interface MapSidebarBaseProps {
  preview: MapRendererState;
  navigation: MapLayerNavigation;
  onLayerChange: (layer: MapBaseLayerId) => void;
  onOverlayChange: (id: MapOverlayId, visible: boolean) => void;
  /** The fullscreen switch rendered above the overlays in either mode. */
  fullscreen: FullscreenControlProps;
}

interface MapSidebarInlineProps extends MapSidebarBaseProps {
  readonly mode?: 'inline';
  /** Cursor readout rendered below the layer sections. */
  inspector?: ReactNode;
}

interface MapSidebarFullscreenProps extends MapSidebarBaseProps {
  readonly mode: 'fullscreen';
  /** Zoom controls rendered above the overlays. */
  view: ViewControlsProps;
  /** Measuring and pinning tools rendered under the view section. */
  toolBar: ToolBarProps;
  /** Cursor readout rendered below the layer sections. */
  inspector: ReactNode;
}

export type MapSidebarProps = MapSidebarInlineProps | MapSidebarFullscreenProps;

export function MapSidebar(props: MapSidebarProps) {
  const { preview, navigation, onLayerChange, onOverlayChange } = props;
  const [collapsed, setCollapsed] = useState(false);
  const [position, setPosition] = useState<PanelPosition>('top');
  const { tabs, activeTab } = navigation;
  const hasLayerViews = tabs.some(tab => (tab.children?.length ?? 0) > 1);
  const overlays = <OverlayControls preview={preview} onOverlayChange={onOverlayChange} />;
  const layerViews = hasLayerViews ? (
    <LayerViews tabs={tabs} activeTab={activeTab} onViewChange={onLayerChange} />
  ) : null;
  const readout = props.inspector ?? null;

  if (props.mode !== 'fullscreen') {
    return (
      <Flex direction='column' gap='3' className={styles.sidebar}>
        <FullscreenControl {...props.fullscreen} />
        <Card size='1' variant='surface' className={styles.section}>
          {overlays}
        </Card>
        {layerViews}
        {readout && (
          <Card size='1' variant='surface' className={`${styles.section} ${styles.card}`}>
            {readout}
          </Card>
        )}
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
        <FullscreenControl {...props.fullscreen} />
        {!collapsed && (
          <>
            <Separator size='4' />
            <ViewControls {...props.view} />
            <Separator size='4' />
            <ToolBar {...props.toolBar} />
            <Separator size='4' />
            {overlays}
            {layerViews && (
              <>
                <Separator size='4' />
                {layerViews}
              </>
            )}
            <Separator size='4' />
            {readout}
          </>
        )}
      </Flex>
    </Card>
  );
}
