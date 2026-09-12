import { useLayoutEffect, useRef, useState } from 'react';
import { Card, Flex, Heading, Separator, Text } from '@radix-ui/themes';

import { usePreviewStore, useRenderStatisticsStore } from '../../stores';
import {
  emptyRenderState,
  type MapBaseLayerId,
  type MapOverlayId,
  MapRenderer,
  type MapRendererState,
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
  const [preview, setPreview] = useState<MapRendererState>(emptyRenderState);
  const setRenderStatistics = useRenderStatisticsStore(state => state.setResult);
  const rendererRef = useRef<MapRenderer | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const overlayCanvas = overlayRef.current;
    const viewportElement = wrapperRef.current;
    if (!canvas || !overlayCanvas || !viewportElement) {
      return;
    }

    const { baseLayer, overlays } = usePreviewStore.getState();
    const renderer = new MapRenderer({ canvas, overlayCanvas, viewportElement }, setPreview, {
      selectedLayer: baseLayer,
      onRenderStatistics: setRenderStatistics,
    });
    for (const [id, visible] of Object.entries(overlays)) {
      if (visible !== undefined) {
        renderer.setOverlay(id as MapOverlayId, visible);
      }
    }
    rendererRef.current = renderer;
    setPreview(renderer.state);
    onReady(renderer);

    return () => {
      rendererRef.current = null;
      onReady(undefined);
      renderer.dispose();
    };
  }, [onReady, setRenderStatistics]);

  const handleBaseLayerChange = (layer: MapBaseLayerId): void => {
    usePreviewStore.getState().setBaseLayer(layer);
    rendererRef.current?.select(layer);
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
