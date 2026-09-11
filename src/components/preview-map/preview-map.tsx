import { useLayoutEffect, useRef, useState } from 'react';
import { Card, Flex, Heading, Separator, Text } from '@radix-ui/themes';

import {
  EMPTY_RENDER_STATE,
  type MapBaseLayerId,
  MapRenderer,
  type MapRendererState,
} from '../../utils/map-renderer';
import { GenerationProgress, type GenerationProgressState } from '../generation-progress';
import { MapLayerControls } from '../map-layer-controls';
import styles from './preview-map.module.scss';

let activeBaseLayer: MapBaseLayerId | undefined;

interface PreviewMapProps {
  onReady: (renderer: MapRenderer | undefined) => void;
  progress?: GenerationProgressState;
  progressKey: number;
}

export function PreviewMap({ onReady, progress, progressKey }: PreviewMapProps) {
  const [preview, setPreview] = useState<MapRendererState>(EMPTY_RENDER_STATE);
  const instanceRef = useRef<MapRenderer | null>(null);
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

    const renderer = new MapRenderer({ canvas, overlayCanvas, viewportElement }, setPreview, {
      selectedLayer: activeBaseLayer,
    });
    instanceRef.current = renderer;
    onReady(renderer);

    return () => {
      instanceRef.current = null;
      onReady(undefined);
      renderer.dispose();
    };
  }, [onReady]);

  const handleBaseLayerChange = (layer: MapBaseLayerId): void => {
    activeBaseLayer = layer;
    instanceRef.current?.select(layer);
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
          onOverlayChange={(id, visible) => instanceRef.current?.setOverlay(id, visible)}
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
