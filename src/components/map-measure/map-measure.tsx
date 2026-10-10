import type { RefObject } from 'react';

import { useElementSize } from '../../hooks/use-element-size';
import { formatDistance } from '../../utils/format';
import type { Measurement } from '../../utils/map-readout';
import { PRESENTATION_MARGIN, project, type ViewTransform } from '../../utils/map-renderer';
import { roundDistance } from '../../utils/measure';
import { normalizedToMeters, type WorldDimensions } from '../../utils/world-dimensions';
import styles from './map-measure.module.scss';

export interface MapMeasureProps {
  /** The map area the line is drawn over. */
  containerRef: RefObject<HTMLElement | null>;
  /** Current placement of the map in the preview. */
  viewTransform: ViewTransform;
  dimensions: WorldDimensions;
  measurement?: Measurement;
}

/** Ruler tick spacing before snapping to a round distance, in CSS pixels. */
const TICK_TARGET_PIXELS = 60;
/** Tick half-length and the label offset from the line, in CSS pixels. */
const TICK_HALF = 4;
const LABEL_OFFSET = 12;

interface Point {
  readonly x: number;
  readonly y: number;
}

interface Tick {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

/** Start and end markers with the ruler line, ticks and distances, over the map. */
export function MapMeasure({
  containerRef,
  viewTransform,
  dimensions,
  measurement,
}: MapMeasureProps) {
  const { width, height } = useElementSize(containerRef);
  if (!measurement || width <= 0 || height <= 0) {
    return null;
  }
  const padding = Math.min(PRESENTATION_MARGIN, width * 0.1, height * 0.1);
  const projection = project(
    viewTransform,
    { width, height },
    { width: dimensions.sampleWidth, height: dimensions.sampleHeight },
    padding
  );
  const start = {
    x: projection.left + measurement.start.u * projection.width,
    y: projection.top + measurement.start.v * projection.height,
  };
  const end = {
    x: projection.left + measurement.end.u * projection.width,
    y: projection.top + measurement.end.v * projection.height,
  };
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  const metersPerPixel = dimensions.widthMeters / dimensions.sampleWidth / projection.cellSize;
  const startMeters = normalizedToMeters(dimensions, measurement.start.u, measurement.start.v);
  const endMeters = normalizedToMeters(dimensions, measurement.end.u, measurement.end.v);
  const totalMeters = Math.hypot(
    endMeters.xMeters - startMeters.xMeters,
    endMeters.yMeters - startMeters.yMeters
  );
  const normal =
    length > 0
      ? { x: (end.y - start.y) / length, y: -(end.x - start.x) / length }
      : { x: 0, y: -1 };

  return (
    <svg className={styles.overlay} aria-hidden='true'>
      <line className={styles.line} x1={start.x} y1={start.y} x2={end.x} y2={end.y} />
      {rulerTicks(start, end, length, metersPerPixel).map(tick => (
        <line
          key={`${tick.x1}:${tick.y1}`}
          className={styles.tick}
          x1={tick.x1}
          y1={tick.y1}
          x2={tick.x2}
          y2={tick.y2}
        />
      ))}
      <circle className={styles.marker} cx={start.x} cy={start.y} r={4} />
      <circle className={styles.marker} cx={end.x} cy={end.y} r={4} />
      <text
        className={styles.label}
        x={start.x + normal.x * LABEL_OFFSET}
        y={start.y + normal.y * LABEL_OFFSET}
        textAnchor='middle'
        dominantBaseline='central'
      >
        0 m
      </text>
      <text
        className={styles.label}
        x={end.x + normal.x * LABEL_OFFSET}
        y={end.y + normal.y * LABEL_OFFSET}
        textAnchor='middle'
        dominantBaseline='central'
      >
        {formatDistance(totalMeters)}
      </text>
    </svg>
  );
}

/** Ruler ticks across the line, every round distance at the current zoom. */
function rulerTicks(start: Point, end: Point, length: number, metersPerPixel: number): Tick[] {
  if (length <= 0 || !Number.isFinite(metersPerPixel) || metersPerPixel <= 0) {
    return [];
  }
  const stepPixels = roundDistance(metersPerPixel * TICK_TARGET_PIXELS) / metersPerPixel;
  if (!Number.isFinite(stepPixels) || stepPixels <= 0) {
    return [];
  }
  const ux = (end.x - start.x) / length;
  const uy = (end.y - start.y) / length;
  const nx = uy;
  const ny = -ux;
  const ticks: Tick[] = [];
  for (let along = stepPixels; along <= length - TICK_HALF * 2; along += stepPixels) {
    const x = start.x + ux * along;
    const y = start.y + uy * along;
    ticks.push({
      x1: x + nx * TICK_HALF,
      y1: y + ny * TICK_HALF,
      x2: x - nx * TICK_HALF,
      y2: y - ny * TICK_HALF,
    });
  }
  return ticks;
}
