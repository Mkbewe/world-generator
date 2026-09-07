import { type RefObject, useEffect, useState } from 'react';
import { Card, Flex, Heading, Separator } from '@radix-ui/themes';

import { MapLayerControls } from './map-layer-controls';
import { renderMapLayers } from './map-layer-renderer';
import {
  isBaseLayerAvailable,
  type MapBaseLayerId,
  type MapOverlayId,
  type PreviewMapLayers,
} from './map-layers';
import { GenerationProgress, type GenerationProgressState } from '../generation-progress';
import styles from './preview-map.module.scss';

interface PreviewMapProps {
  width: number;
  height: number;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  label: string;
  layers: PreviewMapLayers;
  progress?: GenerationProgressState;
}

export function PreviewMap({ width, height, canvasRef, label, layers, progress }: PreviewMapProps) {
  const [baseLayer, setBaseLayer] = useState<MapBaseLayerId>('world-shape');
  const [overlays, setOverlays] = useState<readonly MapOverlayId[]>(['world-boundary']);
  const hasLayers = Boolean(layers.worldMask || layers.noiseMap);
  const activeBaseLayer = !hasLayers
    ? baseLayer
    : isBaseLayerAvailable(baseLayer, layers)
      ? baseLayer
      : layers.worldMask
        ? 'world-shape'
        : 'noise';

  useEffect(() => {
    if (canvasRef.current) {
      renderMapLayers(canvasRef.current, layers, activeBaseLayer, overlays);
    }
  }, [activeBaseLayer, canvasRef, layers, overlays]);

  const handleOverlayToggle = (layer: MapOverlayId, checked: boolean): void => {
    setOverlays(currentOverlays =>
      checked
        ? [...currentOverlays, layer]
        : currentOverlays.filter(currentLayer => currentLayer !== layer)
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
          layers={layers}
          baseLayer={activeBaseLayer}
          overlays={overlays}
          onBaseLayerChange={setBaseLayer}
          onOverlayToggle={handleOverlayToggle}
        >
          <div className={styles.previewWrapper}>
            <canvas
              ref={canvasRef}
              width={width}
              height={height}
              className={styles.canvas}
              aria-label={label}
            />
          </div>
        </MapLayerControls>
        {progress && <GenerationProgress progress={progress} />}
      </Flex>
    </Card>
  );
}
