import {
  ANCHOR_ICON_SIZE_PX,
  paintAnchor,
  paintTypeIcon,
  TYPE_ICON_SIZE_PX,
} from './geology-glyphs';
import type { GeologicalRegionPlan, WorldPoint } from '../../../map-generator/types';
import type { SpatialMask } from '../../types';
import type { MapProjection } from '../../view/view-transform';
import { effectivePixelRatio } from '../../viewport';
import type { MapSize } from '../layer';

/** Steps and length of the nudge that keeps a label inside the world mask. */
const LABEL_CLAMP_STEPS = 32;
const LABEL_CLAMP_STEP_PX = 2;

export interface GeologyLabelsInput {
  readonly context: CanvasRenderingContext2D;
  readonly projection: MapProjection;
  readonly size: MapSize;
  readonly regions: readonly GeologicalRegionPlan[];
  readonly centres: readonly (WorldPoint | undefined)[];
  readonly mask?: SpatialMask;
}

/**
 * Draws one anchor at its true position and one type glyph at the centre of
 * every region; labels that would cross the world edge are nudged inwards.
 */
export function paintLabels(input: GeologyLabelsInput): void {
  const { context, projection, size, regions, centres, mask } = input;
  if (size.width <= 0 || size.height <= 0) {
    return;
  }
  const ratio = effectivePixelRatio(window.devicePixelRatio || 1);
  context.save();
  context.lineJoin = 'round';
  const right = projection.left + projection.width;
  const bottom = projection.top + projection.height;
  const iconSize = TYPE_ICON_SIZE_PX * ratio;
  const visible = (point: { x: number; y: number }): boolean =>
    point.x >= projection.left &&
    point.x <= right &&
    point.y >= projection.top &&
    point.y <= bottom;
  for (const [index, region] of regions.entries()) {
    const anchor = labelPosition(
      region.centre,
      ANCHOR_ICON_SIZE_PX + 2,
      projection,
      mask,
      size,
      ratio
    );
    if (visible(anchor)) {
      paintAnchor(context, anchor.x, anchor.y, ANCHOR_ICON_SIZE_PX * ratio);
    }
    const icon = labelPosition(
      centres[index] ?? region.centre,
      TYPE_ICON_SIZE_PX * 1.15 + 2,
      projection,
      mask,
      size,
      ratio
    );
    if (visible(icon)) {
      paintTypeIcon(context, region.type, icon.x, icon.y, iconSize);
    }
  }
  context.restore();
}

/** Cell of every region closest to its centroid, for the type icon. */
export function regionCentres(
  owners: Int16Array,
  width: number,
  height: number
): (WorldPoint | undefined)[] {
  const sums = new Map<number, { x: number; y: number; count: number }>();
  for (let index = 0; index < owners.length; index++) {
    const owner = owners[index] ?? -1;
    if (owner < 0) {
      continue;
    }
    const x = index % width;
    const y = (index - x) / width;
    const current = sums.get(owner) ?? { x: 0, y: 0, count: 0 };
    sums.set(owner, { x: current.x + x, y: current.y + y, count: current.count + 1 });
  }
  const best = new Map<number, { readonly index: number; readonly distance: number }>();
  for (let index = 0; index < owners.length; index++) {
    const owner = owners[index] ?? -1;
    if (owner < 0) {
      continue;
    }
    const sum = sums.get(owner);
    if (!sum || sum.count === 0) {
      continue;
    }
    const x = index % width;
    const y = (index - x) / width;
    const dx = x - sum.x / sum.count;
    const dy = y - sum.y / sum.count;
    const distance = dx * dx + dy * dy;
    const current = best.get(owner);
    if (!current || distance < current.distance) {
      best.set(owner, { index, distance });
    }
  }
  const centres: (WorldPoint | undefined)[] = [];
  const xDivisor = Math.max(1, width - 1);
  const yDivisor = Math.max(1, height - 1);
  for (const [owner, cell] of best) {
    const x = cell.index % width;
    const y = (cell.index - x) / width;
    centres[owner] = { x: x / xDivisor, y: y / yDivisor };
  }
  return centres;
}

/** Presentation position of a label, nudged towards the centre of the world. */
function labelPosition(
  point: WorldPoint,
  marginPx: number,
  projection: MapProjection,
  mask: SpatialMask | undefined,
  size: MapSize,
  ratio: number
): { readonly x: number; readonly y: number } {
  const x = projection.left + (0.5 + point.x * (size.width - 1)) * projection.cellSize;
  const y = projection.top + (0.5 + point.y * (size.height - 1)) * projection.cellSize;
  return clampIntoMask(x, y, marginPx, projection, mask, size, ratio);
}

/**
 * Nudges a label towards the centre of the world until a margin-sized box
 * around it lies inside the world mask, so the boundary never cuts an icon.
 */
function clampIntoMask(
  x: number,
  y: number,
  marginPx: number,
  projection: MapProjection,
  mask: SpatialMask | undefined,
  size: MapSize,
  ratio: number
): { readonly x: number; readonly y: number } {
  if (!mask) {
    return { x, y };
  }
  const margin = (marginPx * ratio) / projection.cellSize;
  const centreX = size.width / 2;
  const centreY = size.height / 2;
  let sourceX = (x - projection.left) / projection.cellSize;
  let sourceY = (y - projection.top) / projection.cellSize;
  const inside = (): boolean =>
    insideMask(mask, size, sourceX - margin, sourceY - margin) &&
    insideMask(mask, size, sourceX + margin, sourceY - margin) &&
    insideMask(mask, size, sourceX - margin, sourceY + margin) &&
    insideMask(mask, size, sourceX + margin, sourceY + margin);
  const step = LABEL_CLAMP_STEP_PX / projection.cellSize;
  for (let count = 0; count < LABEL_CLAMP_STEPS && !inside(); count++) {
    const dx = centreX - sourceX;
    const dy = centreY - sourceY;
    const length = Math.hypot(dx, dy) || 1;
    sourceX += (dx / length) * step;
    sourceY += (dy / length) * step;
  }
  return {
    x: projection.left + sourceX * projection.cellSize,
    y: projection.top + sourceY * projection.cellSize,
  };
}

/** Mask test in source cell coordinates; out-of-bounds counts as outside. */
function insideMask(mask: SpatialMask, size: MapSize, x: number, y: number): boolean {
  const cellX = Math.round(x);
  const cellY = Math.round(y);
  if (cellX < 0 || cellY < 0 || cellX >= size.width || cellY >= size.height) {
    return false;
  }
  return mask.contains(cellX, cellY);
}
