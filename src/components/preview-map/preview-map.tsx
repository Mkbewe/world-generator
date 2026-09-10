import { type RefObject, useLayoutEffect, useRef, useState } from 'react';
import { Card, Flex, Heading, Separator } from '@radix-ui/themes';

import {
  type AvailablePreviewMapLayers,
  getLayerLabel,
  isBaseLayerAvailable,
  type MapBaseLayerId,
  type MapOverlayId,
  MapPreviewRenderer,
  type PreviewMapLayers,
} from '../../utils/map-preview';
import { GenerationProgress, type GenerationProgressState } from '../generation-progress';
import { MapLayerControls } from '../map-layer-controls';
import styles from './preview-map.module.scss';

interface PreviewMapProps {
  width: number;
  height: number;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  label: string;
  layersRef: RefObject<PreviewMapLayers>;
  availableLayers: AvailablePreviewMapLayers;
  layerRevision: number;
  baseLayer: MapBaseLayerId;
  onBaseLayerChange: (layer: MapBaseLayerId) => void;
  progress?: GenerationProgressState;
  progressKey: number;
}

export function PreviewMap({
  width,
  height,
  canvasRef,
  label,
  layersRef,
  availableLayers,
  layerRevision,
  baseLayer,
  onBaseLayerChange,
  progress,
  progressKey,
}: PreviewMapProps) {
  const [overlays, setOverlays] = useState<readonly MapOverlayId[]>(['world-boundary']);
  const [renderingLayer, setRenderingLayer] = useState<MapBaseLayerId>();
  const previewWrapperRef = useRef<HTMLDivElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<MapPreviewRenderer | undefined>(undefined);
  const hasLayers = Boolean(availableLayers.worldMask || availableLayers.noiseMap);
  const activeBaseLayer = !hasLayers
    ? baseLayer
    : isBaseLayerAvailable(baseLayer, availableLayers)
      ? baseLayer
      : availableLayers.worldMask
        ? 'world-shape'
        : 'noise';

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    const viewportElement = previewWrapperRef.current;
    if (!canvas || !overlayCanvas || !viewportElement) {
      return;
    }

    const renderer = new MapPreviewRenderer(
      { canvas, overlayCanvas, viewportElement },
      { onRenderingChange: setRenderingLayer }
    );
    rendererRef.current = renderer;

    return () => {
      renderer.dispose();
      rendererRef.current = undefined;
    };
  }, [canvasRef]);

  useLayoutEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) {
      return;
    }

    const layers = layersRef.current;
    const hasSource = Boolean(layers.worldMask || layers.noiseMap);
    renderer.setSource(hasSource ? { width, height, revision: layerRevision, layers } : undefined);
    if (hasSource) {
      void renderer.showLayer(activeBaseLayer);
    }
  }, [activeBaseLayer, availableLayers, height, layerRevision, layersRef, width]);

  useLayoutEffect(() => {
    rendererRef.current?.setOverlays(overlays);
  }, [overlays]);

  const handleOverlayToggle = (layer: MapOverlayId, checked: boolean): void => {
    setOverlays(current =>
      checked ? [...current, layer] : current.filter(currentLayer => currentLayer !== layer)
    );
  };

  return (
    <Card size={{ initial: '2', sm: '3' }}>
      <Flex direction='column' gap='4'>
        <Heading size='5' color='violet'>
          Preview
        </Heading>
        <Separator size='4' />
        <MapLayerControls
          layers={availableLayers}
          baseLayer={activeBaseLayer}
          overlays={overlays}
          onBaseLayerChange={onBaseLayerChange}
          onOverlayToggle={handleOverlayToggle}
        >
          <div ref={previewWrapperRef} className={styles.previewWrapper}>
            <canvas
              ref={canvasRef}
              width={width}
              height={height}
              className={styles.canvas}
              aria-label={label}
            />
            <canvas ref={overlayCanvasRef} className={styles.overlayCanvas} aria-hidden='true' />
            <div className={styles.renderingStatus} role='status' hidden={!renderingLayer}>
              {renderingLayer && `Rendering ${getLayerLabel(renderingLayer)}...`}
            </div>
          </div>
        </MapLayerControls>
        {progress && <GenerationProgress key={progressKey} progress={progress} />}
      </Flex>
    </Card>
  );
}
