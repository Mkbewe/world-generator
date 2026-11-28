import { containsGeometry, distanceToGeometry } from '../../geometry';
import { createDisplacementField } from '../../irregularity';
import { RandomFactory } from '../../random/random-factory';
import type { HeatZoneConfig, HeatZoneGeometry, WorldPoint } from '../../types';

export type HeatZoneDistance = (left: WorldPoint, right: WorldPoint) => number;

const HEAT_ZONE_DISPLACEMENT_STREAM = 'base-climate.zones';

export interface HeatZoneClassifierInput {
  readonly seed: number;
  readonly zones: readonly HeatZoneConfig[];
  readonly irregularity?: number;
  readonly distance: HeatZoneDistance;
}

interface GeometryZone {
  readonly geometry: HeatZoneGeometry;
}

export function createHeatZoneClassifier(
  input: HeatZoneClassifierInput
): (x: number, y: number) => number {
  const zoneAt = createHeatZoneSampler(input.zones, input.distance);
  const irregularity = input.irregularity ?? 0;
  const displacement =
    irregularity > 0
      ? createDisplacementField(new RandomFactory(input.seed), HEAT_ZONE_DISPLACEMENT_STREAM)
      : undefined;
  const offset = { x: 0, y: 0 };
  const point = { x: 0, y: 0 };

  return (x, y) => {
    if (displacement) {
      displacement(x, y, offset);
      point.x = x + offset.x * irregularity;
      point.y = y + offset.y * irregularity;
    } else {
      point.x = x;
      point.y = y;
    }
    return zoneAt(point);
  };
}

/**
 * Assigns a zone index to a normalized world point. Later zones paint over
 * earlier ones where geometries overlap; points outside every zone fall back
 * to the nearest one, so the map has no gaps inside the world mask.
 */
export function createGeometryZoneSampler<Zone extends GeometryZone>(
  zones: readonly Zone[],
  distance: HeatZoneDistance,
  fallback: 'nearest' | 'none' = 'nearest'
): (point: WorldPoint) => number {
  if (zones.length === 0) {
    throw new RangeError('At least one climate zone is required.');
  }

  return point => {
    for (let index = zones.length - 1; index >= 0; index--) {
      if (containsGeometry(zones[index].geometry, point, distance)) {
        return index;
      }
    }
    return fallback === 'nearest' ? nearestZoneIndex(zones, point, distance) : -1;
  };
}

/** Heat-zone sampler; the shared geometry sampler keeps the fallback in one place. */
export function createHeatZoneSampler(
  zones: readonly HeatZoneConfig[],
  distance: HeatZoneDistance
): (point: WorldPoint) => number {
  if (zones.length === 0) {
    throw new RangeError('At least one heat zone is required.');
  }
  return createGeometryZoneSampler(zones, distance);
}

function nearestZoneIndex<Zone extends GeometryZone>(
  zones: readonly Zone[],
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
