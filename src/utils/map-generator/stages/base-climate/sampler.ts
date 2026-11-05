import type { HeatZoneConfig, HeatZoneGeometry, WorldPoint } from '../../types';

export type HeatZoneDistance = (left: WorldPoint, right: WorldPoint) => number;

/**
 * tssigns a zone index to a normalized world point. Later zones paint over
 * earlier ones where geometries overlap; points outside every zone fall back
 * to the nearest one, so the map has no gaps inside the world mask.
 */
export function createHeatZoneSampler(
  zones: readonly HeatZoneConfig[],
  distance: HeatZoneDistance
): (point: WorldPoint) => number {
  if (zones.length === 0) {
    throw new RangeError('At least one heat zone is required.');
  }

  return point => {
    for (let index = zones.length - 1; index >= 0; index--) {
      if (contains(zones[index].geometry, point, distance)) {
        return index;
      }
    }
    return nearestZoneIndex(zones, point, distance);
  };
}

function nearestZoneIndex(
  zones: readonly HeatZoneConfig[],
  point: WorldPoint,
  distance: HeatZoneDistance
): number {
  let nearest = 0;
  let nearestDistance = Infinity;

  for (const [index, zone] of zones.entries()) {
    const value = distanceToZone(zone.geometry, point, distance);
    if (value < nearestDistance) {
      nearest = index;
      nearestDistance = value;
    }
  }
  return nearest;
}

function contains(
  geometry: HeatZoneGeometry,
  point: WorldPoint,
  distance: HeatZoneDistance
): boolean {
  if (geometry.kind === 'ring') {
    const radius = distance(point, geometry.center);
    return radius >= geometry.innerRadius && radius <= geometry.outerRadius;
  }
  return Math.abs(point[geometry.axis] - geometry.center) <= geometry.width / 2;
}

function distanceToZone(
  geometry: HeatZoneGeometry,
  point: WorldPoint,
  distance: HeatZoneDistance
): number {
  if (geometry.kind === 'ring') {
    const radius = distance(point, geometry.center);
    return Math.max(geometry.innerRadius - radius, radius - geometry.outerRadius, 0);
  }
  return Math.max(Math.abs(point[geometry.axis] - geometry.center) - geometry.width / 2, 0);
}
