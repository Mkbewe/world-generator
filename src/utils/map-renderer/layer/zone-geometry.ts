import { projectPoint, sideRail } from './landmass-layout-painter';
import type { MapSize } from './layer';
import {
  createZoneSampler,
  type ZoneSampler,
} from '../../map-generator/stages/structure-character/zone-influence';
import type { GeologicalStructure, WorldPoint, ZoneGeometry } from '../../map-generator/types';
import type { MapProjection } from '../view/view-transform';

const TAU = Math.PI * 2;

/** Preview query delegates spatial semantics to the generator's zone port. */
export function containsZone(
  structure: GeologicalStructure,
  geometry: ZoneGeometry,
  point: WorldPoint
): boolean {
  return createZoneSampler(structure).influence(geometry, point).covered;
}

/** Clips a painted body using the same path slice as the domain sampler. */
export function clipZone(
  context: CanvasRenderingContext2D,
  projection: MapProjection,
  size: MapSize,
  structure: GeologicalStructure,
  geometry: ZoneGeometry,
  sampler: ZoneSampler = createZoneSampler(structure)
): void {
  if (geometry.kind === 'whole') {
    return;
  }
  if (geometry.kind === 'point') {
    const center = projectPoint(projection, size, geometry.center);
    context.beginPath();
    context.ellipse(
      center.x,
      center.y,
      Math.max(1, geometry.influenceRadius * (size.width - 1) * projection.cellSize),
      Math.max(1, geometry.influenceRadius * (size.height - 1) * projection.cellSize),
      0,
      0,
      TAU
    );
    context.clip();
    return;
  }
  context.beginPath();
  const axis = sampler.slice(geometry);
  if (axis.points.length < 2) {
    context.clip();
    return;
  }
  const points = axis.points.map(point => projectPoint(projection, size, point));
  const radii = axis.radii.map(radius => ({
    x: radius * (size.width - 1) * projection.cellSize,
    y: radius * (size.height - 1) * projection.cellSize,
  }));
  if (geometry.kind === 'rim') {
    addRibbon(context, points, radii, 1);
    context.clip();
    context.beginPath();
    context.rect(
      projection.left,
      projection.top,
      size.width * projection.cellSize,
      size.height * projection.cellSize
    );
    addRibbon(context, points, radii, 1 - geometry.share);
    context.clip('evenodd');
  } else {
    addRibbon(context, points, radii, geometry.kind === 'spine' ? geometry.share : 1);
    context.clip();
  }
}

function addRibbon(
  context: CanvasRenderingContext2D,
  points: readonly { readonly x: number; readonly y: number }[],
  radii: readonly { readonly x: number; readonly y: number }[],
  share: number
): void {
  const scaled = radii.map(radius => ({ x: radius.x * share, y: radius.y * share }));
  const left = sideRail(points, scaled, -1);
  const right = sideRail(points, scaled, 1);
  context.moveTo(left[0].x, left[0].y);
  for (let index = 1; index < left.length; index++) {
    context.lineTo(left[index].x, left[index].y);
  }
  for (let index = right.length - 1; index >= 0; index--) {
    context.lineTo(right[index].x, right[index].y);
  }
  context.closePath();
}
