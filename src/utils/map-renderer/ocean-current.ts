import { cellToCanvas, type MapProjection } from './view/view-transform';
import type { SpatialMask } from './types';

/** Distance between arrow centres in CSS pixels. */
const ARROW_SPACING = 42;
/** Strength below which no arrow is drawn, so calm cells stay empty. */
const MIN_STRENGTH = 0.04;
/** Arrow length range in CSS pixels; strength scales the length. */
const MIN_ARROW_LENGTH = 7;
const MAX_ARROW_LENGTH = 24;
/** Arrowhead length as a share of the whole arrow and its half-spread. */
const HEAD_LENGTH_RATIO = 0.45;
const HEAD_SPREAD_RATIO = 0.55;

/** One arrow sampled from the BaseClimate current rasters. */
export interface OceanCurrentArrow {
  readonly x: number;
  readonly y: number;
  readonly angle: number;
  readonly strength: number;
}

/**
 * Places one arrow on a screen-space grid so the spacing stays readable at
 * every zoom, and samples the nearest cell of each point.
 */
export function sampleOceanCurrentArrows(
  world: SpatialMask,
  map: Float32Array,
  strength: Float32Array,
  projection: MapProjection,
  ratio: number
): readonly OceanCurrentArrow[] {
  const { width, height } = world.size;
  const spacing = ARROW_SPACING * ratio;
  const step = Math.max(1, Math.round(spacing / Math.max(projection.cellSize, 1e-6)));
  const arrows: OceanCurrentArrow[] = [];
  for (let y = Math.floor(step / 2); y < height; y += step) {
    for (let x = Math.floor(step / 2); x < width; x += step) {
      if (!world.contains(x, y)) {
        continue;
      }
      const index = y * width + x;
      const magnitude = strength[index] ?? 0;
      if (magnitude < MIN_STRENGTH) {
        continue;
      }
      const point = cellToCanvas(projection, x + 0.5, y + 0.5);
      arrows.push({ x: point.x, y: point.y, angle: map[index] ?? 0, strength: magnitude });
    }
  }
  return arrows;
}

/** Appends the shaft and head of every arrow to the current path. */
export function traceOceanCurrentArrows(
  context: CanvasRenderingContext2D,
  arrows: readonly OceanCurrentArrow[],
  ratio: number
): void {
  for (const arrow of arrows) {
    const directionX = Math.cos(arrow.angle);
    const directionY = Math.sin(arrow.angle);
    const length =
      (MIN_ARROW_LENGTH + (MAX_ARROW_LENGTH - MIN_ARROW_LENGTH) * arrow.strength) * ratio;
    const half = length / 2;
    const tipX = arrow.x + directionX * half;
    const tipY = arrow.y + directionY * half;
    context.moveTo(arrow.x - directionX * half, arrow.y - directionY * half);
    context.lineTo(tipX, tipY);

    const head = length * HEAD_LENGTH_RATIO;
    const spread = head * HEAD_SPREAD_RATIO;
    const backX = tipX - directionX * head;
    const backY = tipY - directionY * head;
    context.moveTo(tipX, tipY);
    context.lineTo(backX - directionY * spread, backY + directionX * spread);
    context.moveTo(tipX, tipY);
    context.lineTo(backX + directionY * spread, backY - directionX * spread);
  }
}
