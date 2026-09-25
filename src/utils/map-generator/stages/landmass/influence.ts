import type { PlaceableStructure } from './shape/draft';
import { planarDistance } from '../../space';
import type { LandmassNode, WorldPoint } from '../../types';

/** Nodes of the main corridor, without branch arms. */
export function mainChainNodes(structure: PlaceableStructure): readonly LandmassNode[] {
  return structure.mainNodeCount !== undefined
    ? structure.nodes.slice(0, structure.mainNodeCount)
    : structure.nodes;
}

export interface Bounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

/** One straight piece of a structure's influence, with the radii at both ends. */
export interface StructureSegment {
  readonly from: WorldPoint;
  readonly to: WorldPoint;
  readonly fromRadius: number;
  readonly toRadius: number;
}

/** Closest points of two segments and the distance between them. */
interface SegmentDistance {
  readonly distance: number;
  /** Position of the closest point on the left segment, 0..1. */
  readonly leftAt: number;
  /** Position of the closest point on the right segment, 0..1. */
  readonly rightAt: number;
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
function boundsCentre(bounds: Bounds): WorldPoint {
  return { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
}

export function distanceBetween(left: WorldPoint, right: WorldPoint): number {
  return planarDistance(left, right);
}

/** Centre of a structure's node cloud, used to pin it onto an anchor. */
export function structureCentre(structure: PlaceableStructure): WorldPoint {
  return boundsCentre(boundsOf(structure.nodes.map(node => node.position)));
}

/** Widest influence radius of a structure. */
export function structureRadius(structure: PlaceableStructure): number {
  return Math.max(...structure.nodes.map(node => node.radius));
}

/** Longest side of a structure's influence bounds. */
export function structureExtent(structure: PlaceableStructure): number {
  const bounds = structureBounds(structure);
  return Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
}

/** Direction of the longest edge, used to align structures inside a group. */
export function structureDirection(structure: PlaceableStructure): number {
  const byId = new Map(structure.nodes.map(node => [node.id, node]));
  let longest = -Infinity;
  let direction = 0;

  for (const edge of structure.edges) {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (!from || !to) {
      continue;
    }
    const length = distanceBetween(from.position, to.position);
    if (length > longest) {
      longest = length;
      direction = Math.atan2(to.position.y - from.position.y, to.position.x - from.position.x);
    }
  }
  return direction;
}

/** Bounds of a structure's influence, node and control point radii included. */
export function structureBounds(structure: PlaceableStructure): Bounds {
  const points = [
    ...structure.nodes.map(node => node.position),
    ...structure.edges.flatMap(edge => edge.controlPoints ?? []),
  ];
  const bounds = boundsOf(points);
  const widest = Math.max(...structure.nodes.map(node => node.radius));
  return {
    minX: bounds.minX - widest,
    maxX: bounds.maxX + widest,
    minY: bounds.minY - widest,
    maxY: bounds.maxY + widest,
  };
}

/** Influence segments of a structure: every edge as straight pieces. */
export function structureSegments(structure: PlaceableStructure): StructureSegment[] {
  const byId = new Map(structure.nodes.map(node => [node.id, node]));
  const segments: StructureSegment[] = [];

  if (structure.edges.length === 0) {
    // A single node carries no edges, so its influence is one point segment —
    // without it collisions and the inside share would see nothing at all.
    const only = structure.nodes.length === 1 ? structure.nodes[0] : undefined;
    if (only) {
      segments.push({
        from: only.position,
        to: only.position,
        fromRadius: only.radius,
        toRadius: only.radius,
      });
    }
    return segments;
  }

  for (const edge of structure.edges) {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (!from || !to) {
      continue;
    }
    const points = [from.position, ...(edge.controlPoints ?? []), to.position];
    const radii = interpolatedRadii(points, from.radius, to.radius);
    for (let index = 1; index < points.length; index++) {
      segments.push({
        from: points[index - 1],
        to: points[index],
        fromRadius: radii[index - 1],
        toRadius: radii[index],
      });
    }
  }
  return segments;
}

/** Radii along a polyline, distributed by arc length between the node radii. */
export function interpolatedRadii(
  points: readonly WorldPoint[],
  fromRadius: number,
  toRadius: number
): number[] {
  const total = polylineLength(points);
  const radii = [fromRadius];
  let traversed = 0;

  for (let index = 1; index < points.length; index++) {
    traversed += distanceBetween(points[index - 1], points[index]);
    const at = total > 0 ? traversed / total : 0;
    radii.push(fromRadius + (toRadius - fromRadius) * at);
  }
  return radii;
}

/**
 * Closest points of two segments, following the clamped parametric solution, so
 * the caller can read the interpolated influence radii at those points.
 */
export function segmentDistance(left: StructureSegment, right: StructureSegment): SegmentDistance {
  const directionLeft = { x: left.to.x - left.from.x, y: left.to.y - left.from.y };
  const directionRight = { x: right.to.x - right.from.x, y: right.to.y - right.from.y };
  const between = { x: left.from.x - right.from.x, y: left.from.y - right.from.y };
  const lengthLeft = directionLeft.x * directionLeft.x + directionLeft.y * directionLeft.y;
  const lengthRight = directionRight.x * directionRight.x + directionRight.y * directionRight.y;
  const projection = directionRight.x * between.x + directionRight.y * between.y;
  let leftAt = 0;
  let rightAt = 0;

  if (lengthLeft <= Number.EPSILON && lengthRight <= Number.EPSILON) {
    leftAt = 0;
    rightAt = 0;
  } else if (lengthLeft <= Number.EPSILON) {
    rightAt = clamp01(projection / lengthRight);
  } else {
    const along = directionLeft.x * between.x + directionLeft.y * between.y;
    if (lengthRight <= Number.EPSILON) {
      leftAt = clamp01(-along / lengthLeft);
    } else {
      const cross = directionLeft.x * directionRight.x + directionLeft.y * directionRight.y;
      const denominator = lengthLeft * lengthRight - cross * cross;
      leftAt =
        denominator !== 0 ? clamp01((cross * projection - along * lengthRight) / denominator) : 0;
      rightAt = (cross * leftAt + projection) / lengthRight;
      if (rightAt < 0) {
        rightAt = 0;
        leftAt = clamp01(-along / lengthLeft);
      } else if (rightAt > 1) {
        rightAt = 1;
        leftAt = clamp01((cross - along) / lengthLeft);
      }
    }
  }

  return {
    distance: distanceBetween(
      { x: left.from.x + directionLeft.x * leftAt, y: left.from.y + directionLeft.y * leftAt },
      { x: right.from.x + directionRight.x * rightAt, y: right.from.y + directionRight.y * rightAt }
    ),
    leftAt,
    rightAt,
  };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
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
