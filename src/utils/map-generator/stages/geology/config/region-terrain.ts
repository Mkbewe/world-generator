import type { GeologicalRegionType, RegionTerrainParameter } from '../../../types';

/**
 * Terrain parameters each region type consumes; parameters outside the list
 * stay stored with the region but shape nothing yet.
 */
export const REGION_TERRAIN_SUPPORT: Readonly<
  Record<GeologicalRegionType, readonly RegionTerrainParameter[]>
> = {
  ordinary: ['concentration', 'mountainousness', 'landShare'],
  volcanic: ['concentration', 'landShare'],
  atoll: ['concentration', 'landShare'],
};

/** Neutral terrain metadata per region type; presets and blank slots start here. */
const REGION_TERRAIN_DEFAULTS: Readonly<
  Record<GeologicalRegionType, Readonly<Record<RegionTerrainParameter, number>>>
> = {
  ordinary: { concentration: 0.5, mountainousness: 0.6, landShare: 0.45 },
  volcanic: { concentration: 0.4, mountainousness: 0.5, landShare: 0.35 },
  atoll: { concentration: 0.6, mountainousness: 0.5, landShare: 0.3 },
};

/** Copies the neutral terrain metadata of one region type. */
export function defaultRegionTerrain(
  type: GeologicalRegionType
): Readonly<Record<RegionTerrainParameter, number>> {
  return REGION_TERRAIN_DEFAULTS[type];
}
