import { type RefObject, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { PointerSample } from '@readout';
import type { MapRenderer, ViewTransform } from '@renderer';

import { drawPin, type PinCanvasTheme } from './lib/pin-canvas';
import { pinMarkerPoint } from './lib/pin-geometry';
import { useElementSize } from '../../../../hooks/use-element-size';
import type { WorldDimensions } from '../../../../utils/world-dimensions';
import type { MapReadoutStore } from '../lib/map-readout-store';
import styles from './map-pin.module.scss';

export interface MapPinProps {
  /** The readout store that owns the pinned location. */
  store: MapReadoutStore;
  /** The map area the marker is drawn over. */
  containerRef: RefObject<HTMLElement | null>;
  rendererRef: RefObject<MapRenderer | null>;
  /** Current placement of the map in the preview. */
  viewTransform: ViewTransform;
  dimensions?: WorldDimensions;
}

interface PinFrame {
  readonly viewTransform: ViewTransform;
  readonly dimensions?: WorldDimensions;
  readonly position?: PointerSample;
  readonly width: number;
  readonly height: number;
}

/** The pinned readout location, drawn as a canvas overlay matching the map. */
export function MapPin({
  store,
  containerRef,
  rendererRef,
  viewTransform,
  dimensions,
}: MapPinProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { width, height } = useElementSize(containerRef);
  const latest = useRef<PinFrame>({ viewTransform, dimensions, width, height });
  const draw = useCallback((): void => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const frame = latest.current;
    const ratio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    const pixelWidth = Math.max(1, Math.round(frame.width * ratio));
    const pixelHeight = Math.max(1, Math.round(frame.height * ratio));
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, frame.width, frame.height);
    const point = pinMarkerPoint({
      position: frame.position,
      viewTransform: frame.viewTransform,
      dimensions: frame.dimensions,
      containerWidth: frame.width,
      containerHeight: frame.height,
    });
    if (point) {
      drawPin(context, point, readTheme(canvas));
    }
  }, []);

  useLayoutEffect(() => {
    latest.current = { ...latest.current, viewTransform, dimensions, width, height };
    draw();
  }, [dimensions, draw, height, viewTransform, width]);

  useEffect(() => {
    const update = (): void => {
      const { readout, pinned } = store.getSnapshot();
      latest.current = {
        ...latest.current,
        position: pinned ? readout?.position : undefined,
      };
      draw();
    };
    update();
    return store.subscribe(update);
  }, [draw, store]);

  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) {
      return;
    }
    return renderer.subscribeView(view => {
      latest.current = { ...latest.current, viewTransform: view };
      draw();
    });
  }, [draw, rendererRef]);

  return (
    <canvas ref={canvasRef} className={styles.overlay} aria-hidden='true' data-testid='map-pin' />
  );
}

function readTheme(canvas: HTMLCanvasElement): PinCanvasTheme {
  const style = getComputedStyle(canvas);
  const read = (name: string, fallback: string): string =>
    style.getPropertyValue(name).trim() || fallback;
  return {
    marker: read('--violet-9', '#6e56cf'),
    background: read('--color-background', '#ffffff'),
  };
}
