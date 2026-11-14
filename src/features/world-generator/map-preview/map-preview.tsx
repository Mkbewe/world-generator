import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Flex, Heading, Separator, Text } from '@radix-ui/themes';

import { useMapGestures } from './hooks/use-map-gestures';
import { useMapMeasurement } from './hooks/use-map-measurement';
import { useMapReadout } from './hooks/use-map-readout';
import { useMapRenderer } from './hooks/use-map-renderer';
import { usePreviewControls } from './hooks/use-preview-controls';
import { usePreviewFullscreen } from './hooks/use-preview-fullscreen';
import { usePreviewReadoutAction } from './hooks/use-preview-readout-action';
import { usePreviewTools } from './hooks/use-preview-tools';
import { useTabSync } from './hooks/use-tab-sync';
import { LayerNavigation } from './lib/layer-navigation';
import { LayerTabs } from './layer-tabs';
import { MapCanvas } from './map-canvas';
import { MapReadout } from './map-readout';
import { MapSidebar } from './map-sidebar';
import { tabForLayer, usePreviewStore, useViewSyncStore } from '../../../stores';
import { worldDimensions } from '../../../utils/map-readout';
import { layerRegistry, type MapBaseLayerId, type MapRenderer } from '../../../utils/map-renderer';
import { GenerationProgress, type ProgressViewModel } from '../generation-progress';
import styles from './map-preview.module.scss';

interface MapPreviewProps {
  onReady: (renderer: MapRenderer | undefined) => void;
  progress?: ProgressViewModel;
  progressKey: number;
}

export function MapPreview({ onReady, progress, progressKey }: MapPreviewProps) {
  const { t } = useTranslation();
  const { isFullscreen, toggleFullscreen, triggerRef } = usePreviewFullscreen();
  const cardRef = useRef<HTMLDivElement>(null);
  const layerTree = usePreviewStore(state => state.layerTree);
  const [navigation] = useState(() => new LayerNavigation(layerRegistry.tree));
  const { preview, rendererRef, canvasRef, overlayRef, wrapperRef } = useMapRenderer({
    navigation,
    onReady,
  });
  const navigationState = useMemo(
    () => navigation.toViewState(preview.layers, preview.displayedLayer, layerTree),
    [navigation, preview.layers, preview.displayedLayer, layerTree]
  );
  const [measuring, setMeasuring] = useState(false);
  const measuringActive = isFullscreen && measuring;
  const readout = useMapReadout(rendererRef, preview);
  const measurement = useMapMeasurement({ active: measuringActive });
  const tools = usePreviewTools({
    isFullscreen,
    measuring,
    setMeasuring,
    clearMeasurement: measurement.clear,
    unpin: readout.unpin,
  });
  const resetTools = tools.reset;
  const handleReadoutAction = usePreviewReadoutAction();
  const gestures = useMapGestures({
    rendererRef,
    canvasRef,
    zoomable: isFullscreen,
    measuring: measuringActive,
    pinning: tools.pinningActive,
    readout,
    measurement,
  });
  const hasMap = preview.layers.some(layer => layer.available);
  const dimensions = worldDimensions(preview.info);
  const selectedFeature = useViewSyncStore(state => state.selectedFeature);

  const { clear: clearMeasurement } = measurement;

  useEffect(() => {
    if (isFullscreen) {
      cardRef.current?.focus();
      return;
    }
    rendererRef.current?.resetView();
    clearMeasurement();
  }, [clearMeasurement, isFullscreen, rendererRef]);

  const handleToggleFullscreen = useCallback((): void => {
    if (!isFullscreen) {
      resetTools();
    }
    toggleFullscreen();
  }, [isFullscreen, resetTools, toggleFullscreen]);

  useEffect(() => {
    rendererRef.current?.setSelection(selectedFeature);
  }, [preview.info, rendererRef, selectedFeature]);

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

  const { handleOverlayChange, view, canvasChildren } = usePreviewControls({
    rendererRef,
    wrapperRef,
    preview,
    dimensions,
    measurement: measurement.measurement,
    readoutStore: readout.store,
    isFullscreen,
  });
  const sidebarProps = {
    preview,
    navigation: navigationState,
    onLayerChange: handleLayerChange,
    onOverlayChange: handleOverlayChange,
    fullscreen: {
      active: isFullscreen,
      triggerRef,
      onToggle: handleToggleFullscreen,
    },
    inspector: (
      <MapReadout
        store={readout.store}
        info={preview.info}
        measurement={measurement.measurement}
        actions={!isFullscreen}
        onAction={handleReadoutAction}
      />
    ),
    toolBar: {
      measuring,
      onToggleMeasuring: tools.toggleMeasuring,
      pinning: tools.pinningActive,
      onTogglePinning: tools.togglePinning,
    },
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
          {t('preview.title')}
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
            handlers={gestures.handlers}
            ready={hasMap}
            panning={gestures.panning}
            expanded={isFullscreen}
          >
            {canvasChildren}
          </MapCanvas>
          <div className={styles.spacer} aria-hidden='true' />
          {isFullscreen ? (
            <MapSidebar {...sidebarProps} mode='fullscreen' view={view} />
          ) : (
            <MapSidebar {...sidebarProps} />
          )}
        </Flex>
        {preview.error && (
          <Text size='2' color='red' role='alert'>
            {preview.error}
          </Text>
        )}
        {progress && !isFullscreen && <GenerationProgress key={progressKey} model={progress} />}
      </Flex>
    </Card>
  );
}
