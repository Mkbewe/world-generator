import { type RefObject, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { Measurement } from '@readout';
import type { MapRenderer, ViewTransform } from '@renderer';

import { drawMeasurement, type MeasureCanvasTheme } from './lib/measure-canvas';
import { calculateMeasurementGeometry } from './lib/measure-geometry';
import { useElementSize } from '../../../../hooks/use-element-size';
import type { WorldDimensions } from '../../../../utils/world-dimensions';
import styles from './map-measure.module.scss';

export interface MapMeasureProps {
  /** The map area the measured path is drawn over. */
  containerRef: RefObject<HTMLElement | null>;
  rendererRef: RefObject<MapRenderer | null>;
  /** Current placement of the map in the preview. */
  viewTransform: ViewTransform;
  dimensions: WorldDimensions;
  measurement?: Measurement;
}

interface MeasurementFrame {
  readonly viewTransform: ViewTransform;
  readonly dimensions: WorldDimensions;
  readonly measurement?: Measurement;
  readonly width: number;
  readonly height: number;
}

/** Committed points with the live preview, as a canvas overlay matching the map. */
export function MapMeasure({
  containerRef,
  rendererRef,
  viewTransform,
  dimensions,
  measurement,
}: MapMeasureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { width, height } = useElementSize(containerRef);
  const latest = useRef<MeasurementFrame>({
    viewTransform,
    dimensions,
    measurement,
    width,
    height,
  });
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
    const geometry = calculateMeasurementGeometry({
      measurement: frame.measurement,
      viewTransform: frame.viewTransform,
      dimensions: frame.dimensions,
      containerWidth: frame.width,
      containerHeight: frame.height,
    });
    if (geometry) {
      drawMeasurement(context, geometry, readTheme(canvas));
    }
  }, []);

  useLayoutEffect(() => {
    latest.current = { viewTransform, dimensions, measurement, width, height };
    draw();
  }, [dimensions, draw, height, measurement, viewTransform, width]);

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
    <canvas
      ref={canvasRef}
      className={styles.overlay}
      aria-hidden='true'
      data-testid='map-measure'
    />
  );
}

function readTheme(canvas: HTMLCanvasElement): MeasureCanvasTheme {
  const style = getComputedStyle(canvas);
  const read = (name: string, fallback: string): string =>
    style.getPropertyValue(name).trim() || fallback;
  return {
    line: read('--violet-9', '#6e56cf'),
    background: read('--color-background', '#ffffff'),
    text: read('--gray-12', '#1f1f1f'),
    fontSize: read('--font-size-1', '12px'),
    fontFamily: style.fontFamily || 'sans-serif',
    fontWeight: read('--font-weight-medium', '500'),
  };
}
