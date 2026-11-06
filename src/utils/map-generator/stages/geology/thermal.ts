import type { WorldSpace } from '../../space';
import type { HeatZoneClass, WorldPoint } from '../../types';

const FALLBACK_THERMAL: HeatZoneClass = 'temperate';

/** Samples the heat-zone class at a normalized point from the BaseClimate raster. */
export function createThermalAt(
  heatZoneMap: Int16Array,
  zoneThermals: readonly HeatZoneClass[],
  space: WorldSpace
): (point: WorldPoint) => HeatZoneClass {
  if (heatZoneMap.length !== space.sampleWidth * space.sampleHeight) {
    throw new RangeError('The heat-zone map must match the world raster size.');
  }

  return point => {
    const cell = space.normalizedToCell(point.x, point.y);
    const index = cell.y * space.sampleWidth + cell.x;
    const zone = heatZoneMap[index];
    if (zone === undefined || zone < 0) {
      return FALLBACK_THERMAL;
    }
    return zoneThermals[zone] ?? FALLBACK_THERMAL;
  };
}
