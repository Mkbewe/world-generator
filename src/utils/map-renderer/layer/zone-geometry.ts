import { projectPoint } from './landmass-layout-painter';
import type { MapSize } from './layer';
import { structureExtent } from '../../map-generator/stages/landmass';
import type { GeologicalStructure, WorldPoint, ZoneGeometry } from '../../map-generator/types';
import type { MapProjection } from '../view/view-transform';

/** Amplitude of the zone boundary wobble, as a fraction of the structure span. */
const HALF_WOBBLE = 0.05;

/** Waves across the boundary, so the cut never reads as a straight line. */
const HALF_WAVES = 2;

const TAU = Math.PI * 2;

/** Centre of a structure's node cloud; the fallback keeps malformed data safe. */
export function structureCentre(structure: GeologicalStructure): WorldPoint {
  const points = structure.nodes.map(node => node.position);
  if (points.length === 0) {
    return { x: 0.5, y: 0.5 };
  }
  const sum = points.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), {
    x: 0,
    y: 0,
  });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

/** Stable phase of one structure boundary, so it never changes between frames. */
function boundaryPhase(structureId: string, axis: string): number {
  const input = `${structureId}:${axis}`;
  let hash = 2166136261;
  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (((hash >>> 0) % 1024) / 1024) * Math.PI * 2;
}

/** Boundary position along `base`, wobbling with the cross coordinate `at`. */
function wobbledBoundary(
  structureId: string,
  axis: string,
  at: number,
  base: number,
  amplitude: number
): number {
  return (
    base + Math.sin(at * Math.PI * 2 * HALF_WAVES + boundaryPhase(structureId, axis)) * amplitude
  );
}

/** Whether a normalized point lies inside the zone geometry. */
export function containsZone(
  structure: GeologicalStructure,
  geometry: ZoneGeometry,
  point: WorldPoint
): boolean {
  const centre = structureCentre(structure);
  const extent = structureExtent(structure);
  if (geometry.kind === 'whole') {
    return true;
  }
  if (geometry.kind === 'half') {
    const axis = halfAxis(geometry.axis, structure);
    const base = axis === 'x' ? centre.x : centre.y;
    const at = axis === 'x' ? point.y : point.x;
    const value = axis === 'x' ? point.x : point.y;
    const boundary = wobbledBoundary(structure.id, axis, at, base, HALF_WOBBLE);
    return geometry.side === 'low' ? value < boundary : value >= boundary;
  }
  const distance = Math.hypot(point.x - centre.x, point.y - centre.y);
  if (geometry.kind === 'center') {
    return distance <= geometry.radiusFraction * extent;
  }
  if (geometry.kind === 'point') {
    return (
      Math.hypot(point.x - geometry.center.x, point.y - geometry.center.y) <=
      geometry.influenceRadius
    );
  }
  return distance >= (1 - geometry.widthFraction) * extent;
}

/** Clips the canvas to the zone geometry; false when the geometry has no area. */
export function clipZone(
  context: CanvasRenderingContext2D,
  projection: MapProjection,
  size: MapSize,
  structure: GeologicalStructure,
  geometry: ZoneGeometry
): boolean {
  if (geometry.kind === 'half') {
    clipHalf(context, projection, size, structure, geometry.axis, geometry.side);
    return true;
  }
  if (geometry.kind === 'whole') {
    return true;
  }
  const centre = projectPoint(projection, size, structureCentre(structure));
  const extent = structureExtent(structure);
  const scaleX = Math.max(1, size.width - 1) * projection.cellSize;
  const scaleY = Math.max(1, size.height - 1) * projection.cellSize;

  if (geometry.kind === 'center') {
    const radius = geometry.radiusFraction * extent;
    clipEllipse(context, centre, radius * scaleX, radius * scaleY);
    return true;
  }
  if (geometry.kind === 'point') {
    const point = projectPoint(projection, size, geometry.center);
    clipEllipse(
      context,
      point,
      geometry.influenceRadius * scaleX,
      geometry.influenceRadius * scaleY
    );
    return true;
  }
  // Edge band: the canvas minus the inner ellipse, so only the rim is clipped.
  context.beginPath();
  context.rect(0, 0, size.width, size.height);
  const inner = (1 - geometry.widthFraction) * extent;
  context.ellipse(centre.x, centre.y, inner * scaleX, inner * scaleY, 0, 0, TAU);
  context.clip('evenodd');
  return true;
}

function clipHalf(
  context: CanvasRenderingContext2D,
  projection: MapProjection,
  size: MapSize,
  structure: GeologicalStructure,
  axis: 'along' | 'x' | 'y',
  side: 'low' | 'high'
): void {
  const resolved = halfAxis(axis, structure);
  const low = side === 'low';
  const centre = structureCentre(structure);
  const steps = 24;
  const project = (x: number, y: number) => projectPoint(projection, size, { x, y });
  const corner = low ? 0 : 1;
  context.beginPath();
  if (resolved === 'x') {
    const start = project(corner, 0);
    const end = project(corner, 1);
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    for (let index = steps; index >= 0; index--) {
      const at = index / steps;
      const point = project(wobbledBoundary(structure.id, resolved, at, centre.x, HALF_WOBBLE), at);
      context.lineTo(point.x, point.y);
    }
  } else {
    const start = project(0, corner);
    const end = project(1, corner);
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    for (let index = steps; index >= 0; index--) {
      const at = index / steps;
      const point = project(at, wobbledBoundary(structure.id, resolved, at, centre.y, HALF_WOBBLE));
      context.lineTo(point.x, point.y);
    }
  }
  context.closePath();
  context.clip();
}

function clipEllipse(
  context: CanvasRenderingContext2D,
  point: WorldPoint,
  radiusX: number,
  radiusY: number
): void {
  context.beginPath();
  context.ellipse(point.x, point.y, Math.max(1, radiusX), Math.max(1, radiusY), 0, 0, TAU);
  context.clip();
}

/** `along` follows the structure's longer side, the others use the world axes. */
function halfAxis(axis: 'along' | 'x' | 'y', structure: GeologicalStructure): 'x' | 'y' {
  if (axis !== 'along') {
    return axis;
  }
  return spanOf(structure, 'x') >= spanOf(structure, 'y') ? 'x' : 'y';
}

function spanOf(structure: GeologicalStructure, axis: 'x' | 'y'): number {
  if (structure.nodes.length === 0) {
    return 0;
  }
  const values = structure.nodes.map(node => (axis === 'x' ? node.position.x : node.position.y));
  return Math.max(...values) - Math.min(...values);
}
