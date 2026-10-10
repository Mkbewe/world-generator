import { formatMeasure, formatMeters } from '../../../utils/format';
import { PRESENTATION_MARGIN, project } from '../../../utils/map-renderer';
import type { WorldDimensions } from '../../../utils/world-dimensions';

/** Longest bar drawn, in CSS pixels; the value snaps down to a round distance. */
export const SCALE_BAR_MAX_PIXELS = 110;

export interface ScaleBarSegment {
  /** Round distance the bar represents, in metres. */
  readonly meters: number;
  /** Bar width in CSS pixels. */
  readonly pixels: number;
  /** Readable distance, e.g. "100 m" or "2 km". */
  readonly label: string;
}

/**
 * Metres per CSS pixel of the presentation at the given view: the same
 * projection and margin the renderer uses, measured in the canvas CSS box.
 */
export function metersPerCssPixel(
  zoom: number,
  dimensions: WorldDimensions,
  width: number,
  height: number
): number | undefined {
  if (width <= 0 || height <= 0 || zoom <= 0) {
    return undefined;
  }
  const padding = Math.min(PRESENTATION_MARGIN, width * 0.1, height * 0.1);
  const projection = project(
    { scale: zoom, centerX: 0.5, centerY: 0.5 },
    { width, height },
    { width: dimensions.sampleWidth, height: dimensions.sampleHeight },
    padding
  );
  if (projection.cellSize <= 0) {
    return undefined;
  }
  return dimensions.widthMeters / dimensions.sampleWidth / projection.cellSize;
}

/**
 * Round 1/2/5 × 10^k distance closest to the maximum bar width, so the label
 * stays short and the bar keeps roughly the same length at every zoom.
 */
export function scaleBarSegment(
  metersPerPixel: number,
  maxPixels = SCALE_BAR_MAX_PIXELS
): ScaleBarSegment | undefined {
  if (!Number.isFinite(metersPerPixel) || metersPerPixel <= 0 || maxPixels <= 0) {
    return undefined;
  }
  const raw = metersPerPixel * maxPixels;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  let meters = magnitude;
  for (const step of [1, 2, 5, 10]) {
    const candidate = step * magnitude;
    if (candidate <= raw) {
      meters = candidate;
    }
  }
  return { meters, pixels: meters / metersPerPixel, label: distanceLabel(meters) };
}

function distanceLabel(meters: number): string {
  return meters >= 1000 ? `${formatMeasure(meters / 1000)} km` : formatMeters(meters);
}
