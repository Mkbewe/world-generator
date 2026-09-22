import { useCallback, useEffect, useRef, useState } from 'react';
import { Card, Flex, Heading, Separator, Text } from '@radix-ui/themes';

import { useMapReadout } from './hooks/use-map-readout';
import { useMapRenderer } from './hooks/use-map-renderer';
import { usePreviewFullscreen } from './hooks/use-preview-fullscreen';
import { useTabSync } from './hooks/use-tab-sync';
import { LayerNavigation } from './lib/layer-navigation';
import { tabForLayer, usePreviewStore, useViewSyncStore } from '../../stores';
import { readoutItems } from '../../utils/map-readout';
import {
  layerRegistry,
  type MapBaseLayerId,
  type MapOverlayId,
  type MapRenderer,
} from '../../utils/map-renderer';
import { GenerationProgress, type GenerationProgressState } from '../generation-progress';
import { LayerTabs } from '../layer-tabs';
import { MapCanvas } from '../map-canvas';
import { MapSidebar } from '../map-sidebar';
import styles from './map-preview.module.scss';

interface MapPreviewProps {
  onReady: (renderer: MapRenderer | undefined) => void;
  progress?: GenerationProgressState;
  progressKey: number;
}

export function MapPreview({ onReady, progress, progressKey }: MapPreviewProps) {
  const isFullscreen = usePreviewFullscreen();
  const cardRef = useRef<HTMLDivElement>(null);
  const layerTree = usePreviewStore(state => state.layerTree);
  const [navigation] = useState(() => new LayerNavigation(layerRegistry.tree));
  const { preview, rendererRef, canvasRef, overlayRef, wrapperRef } = useMapRenderer({
    navigation,
    onReady,
  });
  const navigationState = navigation.toViewState(preview.layers, preview.displayedLayer, layerTree);
  const readout = useMapReadout(rendererRef, canvasRef, preview, { zoomable: isFullscreen });
  const hasMap = preview.layers.some(layer => layer.available);

  useEffect(() => {
    if (isFullscreen) {
      cardRef.current?.focus();
      return;
    }
    rendererRef.current?.resetView();
  }, [isFullscreen, rendererRef]);

  /** Applies a selection: the renderer switches and the preview store remembers it. */
  const selectLayer = useCallback(
    (layer: MapBaseLayerId): void => {
      const renderer = rendererRef.current;
      if (!renderer) {
        return;
      }
      renderer.select(layer);
      if (renderer.state.displayedLayer === layer) {
        const { layers } = renderer.state;
        const { layerTree: saved, setBaseLayer } = usePreviewStore.getState();
        setBaseLayer(layer, navigation.toViewState(layers, layer, saved).tabs);
      }
    },
    [navigation, rendererRef]
  );

  /** User selections also move the settings tab while the panels are linked. */
  const handleLayerChange = useCallback(
    (layer: MapBaseLayerId): void => {
      selectLayer(layer);
      const { linked, setSettingsTab } = useViewSyncStore.getState();
      if (!linked) {
        return;
      }
      const tab = tabForLayer(layer);
      if (tab) {
        setSettingsTab(tab);
      }
    },
    [selectLayer]
  );

  useTabSync({ rendererRef, onLayerChange: selectLayer });

  const handleOverlayChange = (id: MapOverlayId, visible: boolean): void => {
    usePreviewStore.getState().setOverlay(id, visible);
    rendererRef.current?.setOverlay(id, visible);
  };

  return (
    <Card
      ref={cardRef}
      tabIndex={-1}
      size={{ initial: '2', sm: '3' }}
      className={styles.card}
      data-fullscreen={isFullscreen || undefined}
      onPointerLeave={readout.handlePointerLeave}
    >
      <Flex direction='column' gap='4' className={styles.body}>
        <Heading size='5' color='violet' className={styles.heading}>
          Preview
        </Heading>
        <Separator size='4' className={styles.separator} />
        <Flex align='stretch' gap='3' className={styles.workspace}>
          <LayerTabs
            navigation={navigationState}
            onLayerChange={handleLayerChange}
            expanded={isFullscreen}
          />
          <MapCanvas
            wrapperRef={wrapperRef}
            canvasRef={canvasRef}
            overlayRef={overlayRef}
            handlers={readout.handlers}
            ready={hasMap}
            panning={readout.panning}
            expanded={isFullscreen}
          />
          <div className={styles.spacer} aria-hidden='true' />
          <MapSidebar
            preview={preview}
            navigation={navigationState}
            onLayerChange={handleLayerChange}
            onOverlayChange={handleOverlayChange}
            inspector={{
              items: readoutItems(readout.readout, preview.info),
              pinned: readout.pinned,
            }}
            view={{
              zoom: preview.zoom,
              fitted: preview.fitted,
              onZoomIn: () => rendererRef.current?.zoomIn(),
              onZoomOut: () => rendererRef.current?.zoomOut(),
              onReset: () => rendererRef.current?.resetView(),
            }}
            expanded={isFullscreen}
          />
        </Flex>
        {preview.error && (
          <Text size='2' color='red' role='alert'>
            {preview.error}
          </Text>
        )}
        {progress && !isFullscreen && <GenerationProgress key={progressKey} progress={progress} />}
      </Flex>
    </Card>
  );
}
