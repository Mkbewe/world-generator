import type { PlaceableStructure } from './shape/draft';
import { MAX_MARGIN_SHARE } from './defaults';
import { type Bounds, structureBounds, structureSegments } from './influence';
import type { WorldDimensions } from '../../../world-dimensions';
import { containsWorld, type WorldShape } from '../../../world-shape';
import { createWorldSpace, planarDistance } from '../../space';
import type { WorldPoint } from '../../types';

/** Tells whether a point lies inside the world the layout is placed in. */
export type WorldSampler = (point: WorldPoint) => boolean;

/** Longest sample step along an influence segment, in normalized units. */
const MAX_SAMPLE_STEP = 0.02;

/** Sample count limits per segment, so a long edge stays cheap. */
const MIN_SEGMENT_SAMPLES = 2;
const MAX_SEGMENT_SAMPLES = 16;

/**
 * Sampler over the generated world mask. The mask is the placement truth, so
 * later irregular worlds need no change here.
 */
export function createMaskSampler(
  worldMask: Uint8Array,
  width: number,
  height: number
): WorldSampler {
  const space = createWorldSpace({ sampleWidth: width, sampleHeight: height });

  return point => {
    // Points outside the map are outside the world, never on its edge.
    if (point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) {
      return false;
    }
    const cell = space.normalizedToCell(point.x, point.y);
    return worldMask[cell.y * width + cell.x] === 1;
  };
}

/** Analytic sampler of a world shape; the mask above is generated from it. */
export function createShapeSampler(shape: WorldShape): WorldSampler {
  return point => containsWorld(shape, 2 * point.x - 1, 2 * point.y - 1);
}

/**
 * Local frame of the world edge at a normalized point: the gap to the edge
 * in normalized units (negative outside) and the tangent direction along it.
 * The disc tangent is perpendicular to the radius; the rectangle follows the
 * nearer edge.
 */
export interface EdgeFrame {
  readonly gap: number;
  readonly tangent: number;
}

export function edgeFrame(shape: WorldShape, point: WorldPoint): EdgeFrame {
  const x = 2 * point.x - 1;
  const y = 2 * point.y - 1;
  if (shape === 'rectangle') {
    const gapX = 1 - Math.abs(x);
    const gapY = 1 - Math.abs(y);
    return gapX < gapY ? { gap: gapX / 2, tangent: Math.PI / 2 } : { gap: gapY / 2, tangent: 0 };
  }
  return { gap: (1 - Math.hypot(x, y)) / 2, tangent: Math.atan2(y, x) + Math.PI / 2 };
}

/**
 * Ocean-margin erosion in normalized units: how far the island ground stays
 * from the world edge on each axis. The single source of the erosion math —
 * the renderer clips its preview through these insets, placement measures
 * against the sampler below, so both agree on where the water starts.
 */
export interface MarginInsets {
  readonly x: number;
  readonly y: number;
}

export function marginInsets(dimensions: WorldDimensions, marginMeters: number): MarginInsets {
  const side = Math.max(1, Math.min(dimensions.widthMeters, dimensions.heightMeters));
  const capped = Math.min(Math.max(0, marginMeters), MAX_MARGIN_SHARE * side);
  return {
    x: capped / Math.max(1, dimensions.widthMeters),
    y: capped / Math.max(1, dimensions.heightMeters),
  };
}

/**
 * Sampler of the shape eroded by an ocean margin in meters: a point counts as
 * inside only with at least the margin of water to the world edge. The margin
 * is capped at a share of the smaller side, so tiny worlds still place. The
 * rectangle erodes exactly per axis; the disc erodes conservatively by the
 * smaller side, so the physical gap holds in every direction.
 */
export function createMarginSampler(
  shape: WorldShape,
  dimensions: WorldDimensions,
  marginMeters: number
): WorldSampler {
  const insets = marginInsets(dimensions, marginMeters);
  if (shape === 'rectangle') {
    return point => {
      if (point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) {
        return false;
      }
      return (
        Math.abs(2 * point.x - 1) <= 1 - 2 * insets.x &&
        Math.abs(2 * point.y - 1) <= 1 - 2 * insets.y
      );
    };
  }
  const radius = 1 - 2 * Math.max(insets.x, insets.y);
  return point => {
    if (point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) {
      return false;
    }
    const dx = 2 * point.x - 1;
    const dy = 2 * point.y - 1;
    return dx * dx + dy * dy <= radius * radius;
  };
}

/**
 * Share of the influence corridor that lies inside the world. The samples cover
 * the whole geometry — every segment, its control points and both sides at the
 * local radius — so a curved edge cannot leave the world unnoticed.
 */
export function insideWorldShare(
  structure: PlaceableStructure,
  insideWorld: WorldSampler,
  bounds: Bounds = structureBounds(structure)
): number {
  // Fast path: a structure whose whole bounding box lies inside needs no samples.
  const corners = [
    { x: bounds.minX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.maxY },
    { x: bounds.minX, y: bounds.maxY },
    { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 },
  ];
  if (corners.every(corner => insideWorld(corner))) {
    return 1;
  }

  let samples = 0;
  let inside = 0;
  const record = (point: WorldPoint): void => {
    samples++;
    if (insideWorld(point)) {
      inside++;
    }
  };

  for (const segment of structureSegments(structure)) {
    const length = planarDistance(segment.from, segment.to);
    const radius = Math.max(Number.EPSILON, Math.min(segment.fromRadius, segment.toRadius));
    const step = Math.min(MAX_SAMPLE_STEP, radius / 2);
    const steps = Math.min(
      MAX_SEGMENT_SAMPLES,
      Math.max(MIN_SEGMENT_SAMPLES, Math.ceil(length / step))
    );
    const alongX = (segment.to.x - segment.from.x) / (length || 1);
    const alongY = (segment.to.y - segment.from.y) / (length || 1);

    for (let index = 0; index <= steps; index++) {
      const at = index / steps;
      const point = {
        x: segment.from.x + (segment.to.x - segment.from.x) * at,
        y: segment.from.y + (segment.to.y - segment.from.y) * at,
      };
      const localRadius = segment.fromRadius + (segment.toRadius - segment.fromRadius) * at;
      const normal = { x: -alongY * localRadius, y: alongX * localRadius };
      record(point);
      record({ x: point.x + normal.x, y: point.y + normal.y });
      record({ x: point.x - normal.x, y: point.y - normal.y });
    }
  }
  return samples === 0 ? 0 : inside / samples;
}
