import type { RefObject } from 'react';

import { useElementSize } from '../../hooks/use-element-size';
import { formatDistance } from '../../utils/format';
import { type Measurement, measurementMeters, segmentMeters } from '../../utils/map-readout';
import { PRESENTATION_MARGIN, project, type ViewTransform } from '../../utils/map-renderer';
import { roundDistance } from '../../utils/measure';
import type { WorldDimensions } from '../../utils/world-dimensions';
import styles from './map-measure.module.scss';

export interface MapMeasureProps {
  /** The map area the measured path is drawn over. */
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
/** Segment lengths sit this far below their segment, in CSS pixels. */
const SEGMENT_LABEL_OFFSET = 18;

interface Point {
  readonly x: number;
  readonly y: number;
}

interface Segment {
  readonly start: Point;
  readonly end: Point;
  readonly preview: boolean;
  readonly meters: number;
}

interface Tick {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

/** Committed points with the live preview, as ruler segments, markers and labels. */
export function MapMeasure({
  containerRef,
  viewTransform,
  dimensions,
  measurement,
}: MapMeasureProps) {
  const { width, height } = useElementSize(containerRef);
  if (!measurement || width <= 0 || height <= 0 || measurement.points.length === 0) {
    return null;
  }
  const padding = Math.min(PRESENTATION_MARGIN, width * 0.1, height * 0.1);
  const projection = project(
    viewTransform,
    { width, height },
    { width: dimensions.sampleWidth, height: dimensions.sampleHeight },
    padding
  );
  const toPixel = (sample: { readonly u: number; readonly v: number }): Point => ({
    x: projection.left + sample.u * projection.width,
    y: projection.top + sample.v * projection.height,
  });
  const points = measurement.points.map(toPixel);
  const preview = measurement.preview ? toPixel(measurement.preview) : undefined;
  const samples = measurement.preview
    ? [...measurement.points, measurement.preview]
    : measurement.points;
  const path = samples.map(toPixel);
  const segments: Segment[] = [];
  for (let index = 1; index < samples.length; index++) {
    const startSample = samples[index - 1];
    const endSample = samples[index];
    const start = path[index - 1];
    const end = path[index];
    if (startSample && endSample && start && end) {
      segments.push({
        start,
        end,
        preview: index === samples.length - 1 && preview !== undefined,
        meters: segmentMeters(dimensions, startSample, endSample),
      });
    }
  }
  const metersPerPixel = dimensions.widthMeters / dimensions.sampleWidth / projection.cellSize;
  const totalMeters = measurementMeters(dimensions, measurement);
  const last = path[path.length - 1];
  const previous = path[path.length - 2] ?? last;
  const normal = last ? normalOf(previous, last) : { x: 0, y: -1 };
  const first = points[0];
  const second = points[1];
  // The start label follows the first committed segment, never the live
  // preview, so it stays put while the pointer turns around the start point.
  const startNormal = first && second ? normalOf(first, second) : { x: 0, y: -1 };

  return (
    <svg className={styles.overlay} aria-hidden='true'>
      {segments.map((segment, index) => (
        <g key={`segment-${index}`}>
          <line
            className={segment.preview ? styles.preview : styles.line}
            x1={segment.start.x}
            y1={segment.start.y}
            x2={segment.end.x}
            y2={segment.end.y}
          />
          {rulerTicks(segment.start, segment.end, metersPerPixel).map(tick => (
            <line
              key={`${tick.x1}:${tick.y1}`}
              className={styles.tick}
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
            />
          ))}
        </g>
      ))}
      {segments.map((segment, index) => {
        const normal = normalOf(segment.start, segment.end);
        return (
          <text
            key={`segment-label-${index}`}
            className={styles.label}
            x={(segment.start.x + segment.end.x) / 2 - normal.x * SEGMENT_LABEL_OFFSET}
            y={(segment.start.y + segment.end.y) / 2 - normal.y * SEGMENT_LABEL_OFFSET}
            textAnchor='middle'
            dominantBaseline='central'
          >
            {formatDistance(segment.meters)}
          </text>
        );
      })}
      {points.map((point, index) => (
        <circle key={`point-${index}`} className={styles.marker} cx={point.x} cy={point.y} r={4} />
      ))}
      {preview && <circle className={styles.previewMarker} cx={preview.x} cy={preview.y} r={3} />}
      <text
        className={styles.label}
        x={points[0].x + startNormal.x * LABEL_OFFSET}
        y={points[0].y + startNormal.y * LABEL_OFFSET}
        textAnchor='middle'
        dominantBaseline='central'
      >
        0 m
      </text>
      {last && segments.length > 0 && (
        <text
          className={styles.label}
          x={last.x + normal.x * LABEL_OFFSET}
          y={last.y + normal.y * LABEL_OFFSET}
          textAnchor='middle'
          dominantBaseline='central'
        >
          {formatDistance(totalMeters)}
        </text>
      )}
    </svg>
  );
}

/** Unit normal of a segment; a vertical fallback for a zero-length one. */
function normalOf(start: Point, end: Point): Point {
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  if (length <= 0) {
    return { x: 0, y: -1 };
  }
  return { x: (end.y - start.y) / length, y: -(end.x - start.x) / length };
}

/** Ruler ticks across one segment, every round distance at the current zoom. */
function rulerTicks(start: Point, end: Point, metersPerPixel: number): Tick[] {
  const length = Math.hypot(end.x - start.x, end.y - start.y);
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
