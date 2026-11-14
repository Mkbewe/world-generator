import { type RefObject, useCallback, useMemo } from 'react';
import type { Measurement } from '@readout';
import type { MapOverlayId, MapRenderer, MapRendererState } from '@renderer';

import { usePreviewStore } from '../../../../stores';
import type { WorldDimensions } from '../../../../utils/world-dimensions';
import { MapMeasure } from '../map-measure';
import { ScaleBar } from '../scale-bar';

interface PreviewControlsOptions {
  rendererRef: RefObject<MapRenderer | null>;
  wrapperRef: RefObject<HTMLDivElement | null>;
  preview: MapRendererState;
  dimensions?: WorldDimensions;
  measurement?: Measurement;
  isFullscreen: boolean;
  measuring: boolean;
  setMeasuring: (measuring: boolean) => void;
  onClearMeasurement: () => void;
}

/** Stable view, measure and overlay controls for the preview sidebar and canvas. */
export function usePreviewControls({
  rendererRef,
  wrapperRef,
  preview,
  dimensions,
  measurement,
  isFullscreen,
  measuring,
  setMeasuring,
  onClearMeasurement,
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
  const handleToggleMeasuring = useCallback((): void => {
    if (measuring) {
      onClearMeasurement();
    }
    setMeasuring(!measuring);
  }, [measuring, onClearMeasurement, setMeasuring]);

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

  const measure = useMemo(
    () => ({ measuring, onToggleMeasuring: handleToggleMeasuring }),
    [handleToggleMeasuring, measuring]
  );

  const canvasChildren = useMemo(
    () =>
      dimensions ? (
        <>
          <ScaleBar containerRef={wrapperRef} zoom={preview.zoom} dimensions={dimensions} />
          <MapMeasure
            containerRef={wrapperRef}
            viewTransform={preview.viewTransform}
            dimensions={dimensions}
            measurement={measurement}
          />
        </>
      ) : null,
    [dimensions, measurement, preview.viewTransform, preview.zoom, wrapperRef]
  );

  return { handleOverlayChange, view, measure, canvasChildren };
}
