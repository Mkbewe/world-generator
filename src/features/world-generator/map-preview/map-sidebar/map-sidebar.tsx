import { useState } from 'react';
import { Card, Flex, Separator } from '@radix-ui/themes';

import { CursorReadout, type CursorReadoutProps } from './cursor-readout';
import { LayerViews } from './layer-views';
import { MeasureControls, type MeasureControlsProps } from './measure-controls';
import { OverlayControls } from './overlay-controls';
import { PanelHeader, type PanelPosition } from './panel-header';
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
}

interface MapSidebarInlineProps extends MapSidebarBaseProps {
  readonly mode?: 'inline';
  /** Cursor readout rendered below the layer sections. */
  inspector?: CursorReadoutProps;
}

interface MapSidebarFullscreenProps extends MapSidebarBaseProps {
  readonly mode: 'fullscreen';
  /** Zoom controls rendered above the overlays. */
  view: ViewControlsProps;
  /** Distance measuring controls rendered under the view section. */
  measure: MeasureControlsProps;
  /** Cursor readout rendered below the layer sections. */
  inspector: CursorReadoutProps;
}

export type MapSidebarProps = MapSidebarInlineProps | MapSidebarFullscreenProps;

export function MapSidebar(props: MapSidebarProps) {
  const { preview, navigation, onLayerChange, onOverlayChange } = props;
  const [collapsed, setCollapsed] = useState(false);
  const [position, setPosition] = useState<PanelPosition>('middle');
  const { tabs, activeTab } = navigation;
  const hasLayerViews = tabs.some(tab => (tab.children?.length ?? 0) > 1);
  const overlays = <OverlayControls preview={preview} onOverlayChange={onOverlayChange} />;
  const layerViews = hasLayerViews ? (
    <LayerViews tabs={tabs} activeTab={activeTab} onViewChange={onLayerChange} />
  ) : null;
  const readout = props.inspector ? <CursorReadout {...props.inspector} /> : null;

  if (props.mode !== 'fullscreen') {
    return (
      <Flex direction='column' gap='3' className={styles.sidebar}>
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
        {!collapsed && (
          <>
            <ViewControls {...props.view} />
            <Separator size='4' />
            <MeasureControls {...props.measure} />
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
