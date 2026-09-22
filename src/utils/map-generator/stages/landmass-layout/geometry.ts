import type { WorldPoint } from '../../types';

export interface Bounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

/** Total length of a polyline. */
export function polylineLength(points: readonly WorldPoint[]): number {
  let length = 0;
  for (let index = 1; index < points.length; index++) {
    length += distanceBetween(points[index - 1], points[index]);
  }
  return length;
}

/** Bounds of a point cloud. */
export function boundsOf(points: readonly WorldPoint[]): Bounds {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  return { minX, maxX, minY, maxY };
}

/** Centre of a bounds rectangle. */
export function boundsCentre(bounds: Bounds): WorldPoint {
  return { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
}

export function distanceBetween(left: WorldPoint, right: WorldPoint): number {
  return Math.hypot(right.x - left.x, right.y - left.y);
}

/** Moves a point by the given offset. */
export function offsetPoint(point: WorldPoint, offset: WorldPoint): WorldPoint {
  return { x: point.x + offset.x, y: point.y + offset.y };
}

/**
 * Point and travel direction at a fraction of the polyline length. The fraction
 * is clamped, so both ends are reachable.
 */
export function pointAlong(
  points: readonly WorldPoint[],
  at: number
): { readonly point: WorldPoint; readonly direction: number } {
  const total = polylineLength(points);
  let remaining = Math.min(1, Math.max(0, at)) * total;

  for (let index = 1; index < points.length; index++) {
    const from = points[index - 1];
    const to = points[index];
    const length = distanceBetween(from, to);
    if (remaining > length && index < points.length - 1) {
      remaining -= length;
      continue;
    }
    const progress = length > 0 ? Math.min(1, remaining / length) : 0;
    return {
      point: {
        x: from.x + (to.x - from.x) * progress,
        y: from.y + (to.y - from.y) * progress,
      },
      direction: Math.atan2(to.y - from.y, to.x - from.x),
    };
  }

  const last = points[points.length - 1];
  return { point: last, direction: 0 };
}
