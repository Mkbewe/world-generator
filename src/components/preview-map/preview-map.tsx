import { useState } from 'react';
import { Card, Flex, Heading, Separator, Text } from '@radix-ui/themes';

import { useMapReadout } from './lib/use-map-readout';
import { useMapRenderer } from './lib/use-map-renderer';
import { LayerNavigation } from './layer-navigation';
import { MapInspector } from './map-inspector';
import { readoutItems } from './readout';
import { usePreviewStore } from '../../stores';
import {
  layerRegistry,
  type MapBaseLayerId,
  type MapOverlayId,
  type MapRenderer,
} from '../../utils/map-renderer';
import { GenerationProgress, type GenerationProgressState } from '../generation-progress';
import { MapLayerControls } from '../map-layer-controls';
import styles from './preview-map.module.scss';

interface PreviewMapProps {
  onReady: (renderer: MapRenderer | undefined) => void;
  progress?: GenerationProgressState;
  progressKey: number;
}

export function PreviewMap({ onReady, progress, progressKey }: PreviewMapProps) {
  const [navigation] = useState(
    () => new LayerNavigation(layerRegistry.tree, usePreviewStore.getState().layerTree)
  );
  const { preview, rendererRef, canvasRef, overlayRef, wrapperRef } = useMapRenderer({
    navigation,
    onReady,
  });
  const navigationState = navigation.toViewState(preview.layers, preview.displayedLayer);
  const readout = useMapReadout(rendererRef, preview);

  const handleBaseLayerChange = (layer: MapBaseLayerId): void => {
    const renderer = rendererRef.current;
    if (!renderer) {
      return;
    }
    renderer.select(layer);
    if (renderer.state.displayedLayer === layer) {
      navigation.select(layer);
      const { layers } = renderer.state;
      usePreviewStore.getState().setBaseLayer(layer, navigation.toViewState(layers, layer).tabs);
    }
  };

  const handleOverlayChange = (id: MapOverlayId, visible: boolean): void => {
    usePreviewStore.getState().setOverlay(id, visible);
    rendererRef.current?.setOverlay(id, visible);
  };

  return (
    <Card size={{ initial: '2', sm: '3' }}>
      <Flex direction='column' gap='4'>
        <Heading size='5' color='violet'>
          Preview
        </Heading>
        <Separator size='4' />
        <MapLayerControls
          preview={preview}
          navigation={navigationState}
          onBaseLayerChange={handleBaseLayerChange}
          onOverlayChange={handleOverlayChange}
        >
          <div ref={wrapperRef} className={styles.previewWrapper}>
            <canvas
              ref={canvasRef}
              width={0}
              height={0}
              className={styles.canvas}
              aria-label='Generated map preview'
              {...readout.handlers}
            />
            <canvas
              ref={overlayRef}
              width={0}
              height={0}
              className={styles.overlayCanvas}
              aria-hidden='true'
            />
          </div>
        </MapLayerControls>
        <MapInspector items={readoutItems(readout.readout, preview.info)} pinned={readout.pinned} />
        {preview.error && (
          <Text size='2' color='red' role='alert'>
            {preview.error}
          </Text>
        )}
        {progress && <GenerationProgress key={progressKey} progress={progress} />}
      </Flex>
    </Card>
  );
}
