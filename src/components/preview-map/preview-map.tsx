import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Card, Flex, Heading, Separator, Text } from '@radix-ui/themes';

import { LayerNavigation } from './layer-navigation';
import { MapInspector } from './map-inspector';
import { type InspectorReadout, type PointerSample, readoutItems, samplePointer } from './readout';
import { usePreviewStore, useRenderStatisticsStore } from '../../stores';
import {
  emptyRenderState,
  layerRegistry,
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
  const [navigation] = useState(
    () => new LayerNavigation(layerRegistry.tree, usePreviewStore.getState().layerTree)
  );
  const navigationState = navigation.toViewState(preview.layers, preview.displayedLayer);
  const setRenderStatistics = useRenderStatisticsStore(state => state.setResult);
  const rendererRef = useRef<MapRenderer | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const positionRef = useRef<PointerSample | undefined>(undefined);
  const [readout, setReadout] = useState<InspectorReadout | undefined>(undefined);
  const [pinned, setPinned] = useState(false);

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
      shouldDisplay: id => navigation.leadsToSelection(id),
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
  }, [navigation, onReady, setRenderStatistics]);

  const refreshReadout = useCallback((position: PointerSample): void => {
    setReadout({
      position,
      inspection: rendererRef.current?.inspect(position.x, position.y),
    });
  }, []);

  useEffect(() => {
    if (pinned) {
      return;
    }
    const position = positionRef.current;
    if (position && rendererRef.current?.currentSize) {
      refreshReadout(position);
    }
  }, [pinned, preview.displayedLayer, refreshReadout]);

  const sampleAt = (event: React.PointerEvent<HTMLCanvasElement>): PointerSample | undefined => {
    const size = rendererRef.current?.currentSize;
    if (!size) {
      return undefined;
    }
    return samplePointer(
      event.currentTarget.getBoundingClientRect(),
      size,
      event.clientX,
      event.clientY
    );
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    if (pinned) {
      return;
    }
    const position = sampleAt(event);
    if (!position) {
      return;
    }
    const last = positionRef.current;
    if (last && last.x === position.x && last.y === position.y) {
      return;
    }
    positionRef.current = position;
    refreshReadout(position);
  };

  /** The first left click or tap pins the readout; the next one releases it. */
  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    if (event.button !== 0) {
      return;
    }
    const position = sampleAt(event);
    if (!position) {
      return;
    }
    positionRef.current = position;
    refreshReadout(position);
    setPinned(current => !current);
  };

  const handlePointerLeave = (): void => {
    if (pinned) {
      return;
    }
    positionRef.current = undefined;
    setReadout(undefined);
  };

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
              onPointerMove={handlePointerMove}
              onPointerDown={handlePointerDown}
              onPointerLeave={handlePointerLeave}
              onPointerCancel={handlePointerLeave}
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
        <MapInspector items={readoutItems(readout)} pinned={pinned} />
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
