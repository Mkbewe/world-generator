import { type RefObject, useCallback, useMemo } from 'react';
import type { Measurement } from '@readout';
import type { MapOverlayId, MapRenderer, MapRendererState } from '@renderer';

import { usePreviewStore } from '../../../../stores';
import type { WorldDimensions } from '../../../../utils/world-dimensions';
import type { MapReadoutStore } from '../lib/map-readout-store';
import { MapMeasure } from '../map-measure';
import { MapPin } from '../map-pin';
import { ScaleBar } from '../scale-bar';

interface PreviewControlsOptions {
  rendererRef: RefObject<MapRenderer | null>;
  wrapperRef: RefObject<HTMLDivElement | null>;
  preview: MapRendererState;
  dimensions?: WorldDimensions;
  measurement?: Measurement;
  readoutStore: MapReadoutStore;
  isFullscreen: boolean;
}

/** Stable view and overlay controls with the canvas overlays of the preview. */
export function usePreviewControls({
  rendererRef,
  wrapperRef,
  preview,
  dimensions,
  measurement,
  readoutStore,
  isFullscreen,
}: PreviewControlsOptions) {
  const handleOverlayChange = useCallback(
    (id: MapOverlayId, visible: boolean): void => {
      usePreviewStore.getState().setOverlay(id, visible);
      rendererRef.current?.setOverlay(id, visible);
    },
    [rendererRef]
  );

  const handleZoomIn = useCallback((): void => rendererRef.current?.zoomIn(), [rendererRef]);
  const handleZoomOut = useCallback((): void => rendererRef.current?.zoomOut(), [rendererRef]);
  const handleResetView = useCallback((): void => rendererRef.current?.resetView(), [rendererRef]);

  const view = useMemo(
    () => ({
      zoom: preview.zoom,
      fitted: preview.fitted,
      zoomable: isFullscreen,
      onZoomIn: handleZoomIn,
      onZoomOut: handleZoomOut,
      onReset: handleResetView,
    }),
    [handleResetView, handleZoomIn, handleZoomOut, isFullscreen, preview.fitted, preview.zoom]
  );

  const canvasChildren = useMemo(
    () =>
      dimensions ? (
        <>
          <ScaleBar containerRef={wrapperRef} zoom={preview.zoom} dimensions={dimensions} />
          <MapMeasure
            containerRef={wrapperRef}
            rendererRef={rendererRef}
            viewTransform={preview.viewTransform}
            dimensions={dimensions}
            measurement={measurement}
          />
          <MapPin
            store={readoutStore}
            containerRef={wrapperRef}
            rendererRef={rendererRef}
            viewTransform={preview.viewTransform}
            dimensions={dimensions}
          />
        </>
      ) : null,
    [
      dimensions,
      measurement,
      preview.viewTransform,
      preview.zoom,
      readoutStore,
      rendererRef,
      wrapperRef,
    ]
  );

  return { handleOverlayChange, view, canvasChildren };
}
