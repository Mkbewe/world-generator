import { createWorldSpace } from '@generator/space';
import { type Measurement, measurementMeters, segmentMeters } from '@readout';
import { PRESENTATION_MARGIN, project, type ViewTransform } from '@renderer';

import { formatDistance } from '../../../../../utils/format';
import { roundDistance } from '../../../../../utils/measure';
import type { WorldDimensions } from '../../../../../utils/world-dimensions';

/** Ruler tick spacing before snapping to a round distance, in CSS pixels. */
export const TICK_TARGET_PIXELS = 60;
/** Tick half-length and the label offset from the line, in CSS pixels. */
export const TICK_HALF = 4;
export const LABEL_OFFSET = 12;
/** Segment lengths sit this far below their segment, in CSS pixels. */
export const SEGMENT_LABEL_OFFSET = 18;

export interface MeasurePoint {
  readonly x: number;
  readonly y: number;
}

export interface MeasureTick {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

export interface MeasureLabel {
  readonly x: number;
  readonly y: number;
  readonly text: string;
}

export interface MeasureSegment {
  readonly start: MeasurePoint;
  readonly end: MeasurePoint;
  readonly preview: boolean;
  readonly meters: number;
  readonly label: MeasureLabel;
  readonly ticks: readonly MeasureTick[];
}

export interface MeasurementGeometry {
  readonly segments: readonly MeasureSegment[];
  readonly points: readonly MeasurePoint[];
  readonly previewPoint?: MeasurePoint;
  readonly startLabel: MeasureLabel;
  readonly totalLabel?: MeasureLabel;
}

export interface MeasurementGeometryInput {
  readonly measurement?: Measurement;
  readonly viewTransform: ViewTransform;
  readonly dimensions: WorldDimensions;
  readonly containerWidth: number;
  readonly containerHeight: number;
}

/** Unit normal of a segment; a vertical fallback for a zero-length one. */
export function normalOf(start: MeasurePoint, end: MeasurePoint): MeasurePoint {
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  if (length <= 0) {
    return { x: 0, y: -1 };
  }
  return { x: (end.y - start.y) / length, y: -(end.x - start.x) / length };
}

/** Ruler ticks across one segment, every round distance at the current zoom. */
export function rulerTicks(
  start: MeasurePoint,
  end: MeasurePoint,
  metersPerPixel: number
): MeasureTick[] {
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
  const ticks: MeasureTick[] = [];
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

/**
 * Calculates projected points, segments, ruler ticks, and label coordinates
 * for the map measurement overlay.
 */
export function calculateMeasurementGeometry(
  input: MeasurementGeometryInput
): MeasurementGeometry | undefined {
  const { measurement, viewTransform, dimensions, containerWidth, containerHeight } = input;
  if (
    !measurement ||
    containerWidth <= 0 ||
    containerHeight <= 0 ||
    measurement.points.length === 0 ||
    viewTransform.scale <= 0 ||
    !Number.isFinite(viewTransform.scale)
  ) {
    return undefined;
  }

  const space = createWorldSpace(dimensions);
  const padding = Math.min(PRESENTATION_MARGIN, containerWidth * 0.1, containerHeight * 0.1);
  const projection = project(
    viewTransform,
    { width: containerWidth, height: containerHeight },
    { width: dimensions.sampleWidth, height: dimensions.sampleHeight },
    padding
  );
  if (projection.cellSize <= 0) {
    return undefined;
  }

  const toPixel = (sample: { readonly u: number; readonly v: number }): MeasurePoint => ({
    x: projection.left + sample.u * projection.width,
    y: projection.top + sample.v * projection.height,
  });

  const points = measurement.points.map(toPixel);
  const first = points[0];
  if (!first) {
    return undefined;
  }

  const previewPoint = measurement.preview ? toPixel(measurement.preview) : undefined;
  const samples = measurement.preview
    ? [...measurement.points, measurement.preview]
    : measurement.points;
  const path = samples.map(toPixel);

  const metersPerPixel = dimensions.widthMeters / dimensions.sampleWidth / projection.cellSize;

  const segments: MeasureSegment[] = [];
  for (let index = 1; index < samples.length; index++) {
    const startSample = samples[index - 1];
    const endSample = samples[index];
    const start = path[index - 1];
    const end = path[index];
    if (startSample && endSample && start && end) {
      const normal = normalOf(start, end);
      const meters = segmentMeters(space, startSample, endSample);
      segments.push({
        start,
        end,
        preview: index === samples.length - 1 && previewPoint !== undefined,
        meters,
        label: {
          x: (start.x + end.x) / 2 - normal.x * SEGMENT_LABEL_OFFSET,
          y: (start.y + end.y) / 2 - normal.y * SEGMENT_LABEL_OFFSET,
          text: formatDistance(meters),
        },
        ticks: rulerTicks(start, end, metersPerPixel),
      });
    }
  }

  const totalMeters = measurementMeters(space, measurement);
  const second = points[1];
  // The start label follows the first committed segment, never the live
  // preview, so it stays put while the pointer turns around the start point.
  const startNormal = second ? normalOf(first, second) : { x: 0, y: -1 };

  const startLabel: MeasureLabel = {
    x: first.x + startNormal.x * LABEL_OFFSET,
    y: first.y + startNormal.y * LABEL_OFFSET,
    text: '0 m',
  };

  const last = path[path.length - 1];
  const previous = path[path.length - 2] ?? last;
  const normal = last ? normalOf(previous, last) : { x: 0, y: -1 };

  const totalLabel: MeasureLabel | undefined =
    last && segments.length > 0
      ? {
          x: last.x + normal.x * LABEL_OFFSET,
          y: last.y + normal.y * LABEL_OFFSET,
          text: formatDistance(totalMeters),
        }
      : undefined;

  return {
    segments,
    points,
    previewPoint,
    startLabel,
    totalLabel,
  };
}
