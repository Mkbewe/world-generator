import { containsGeometry, distanceToGeometry } from '../../geometry';
import type { HeatZoneConfig, WorldPoint } from '../../types';

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
      if (containsGeometry(zones[index].geometry, point, distance)) {
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
    const value = distanceToGeometry(zone.geometry, point, distance);
    if (value < nearestDistance) {
      nearest = index;
      nearestDistance = value;
    }
  }
  return nearest;
}
