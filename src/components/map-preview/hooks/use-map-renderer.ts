import { useLayoutEffect, useRef, useState } from 'react';

import { usePreviewStore, useRenderStatisticsStore } from '../../../stores';
import {
  emptyRenderState,
  type MapOverlayId,
  MapRenderer,
  type MapRendererState,
} from '../../../utils/map-renderer';
import type { LayerNavigation } from '../lib/layer-navigation';

interface UseMapRendererOptions {
  navigation: LayerNavigation;
  onReady: (renderer: MapRenderer | undefined) => void;
}

/** Owns the renderer instance, its canvas refs and the preview state it reports. */
export function useMapRenderer({ navigation, onReady }: UseMapRendererOptions) {
  const [preview, setPreview] = useState<MapRendererState>(emptyRenderState);
  const setRenderStatistics = useRenderStatisticsStore(state => state.setResult);
  const rendererRef = useRef<MapRenderer | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

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

  return { preview, rendererRef, canvasRef, overlayRef, wrapperRef };
}
