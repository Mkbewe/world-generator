import type {
  GeologicalRegionType,
  RegionTerrainConfig,
  RegionTerrainParameter,
} from '../../types';
import { MAX_GEOLOGICAL_REGIONS } from '../geology';

/**
 * Terrain parameters each region type consumes; parameters outside the list
 * stay stored with the region but shape nothing yet.
 */
export const REGION_TERRAIN_SUPPORT: Readonly<
  Record<GeologicalRegionType, readonly RegionTerrainParameter[]>
> = {
  ordinary: ['landShare', 'concentration', 'age', 'mountainousness'],
  volcanic: ['landShare', 'concentration', 'age'],
  lagoon: ['landShare', 'concentration', 'age'],
  fjord: ['landShare', 'concentration', 'age'],
};

/** Neutral terrain metadata per region type; presets and blank slots start here. */
const REGION_TERRAIN_DEFAULTS: Readonly<Record<GeologicalRegionType, RegionTerrainConfig>> = {
  ordinary: { landShare: 0.5, concentration: 0.65, age: 0.45, mountainousness: 0.6 },
  volcanic: { landShare: 0.45, concentration: 0.7, age: 0.3, mountainousness: 0.5 },
  lagoon: { landShare: 0.25, concentration: 0.4, age: 0.6, mountainousness: 0.5 },
  fjord: { landShare: 0.55, concentration: 0.6, age: 0.35, mountainousness: 0.7 },
};

/** Copies the neutral terrain metadata of one region type. */
export function defaultRegionTerrain(type: GeologicalRegionType): RegionTerrainConfig {
  return REGION_TERRAIN_DEFAULTS[type];
}

/** Editable terrain slots: the given types in order, padded to the region limit. */
export function defaultRegionTerrainSlots(
  types: readonly GeologicalRegionType[]
): readonly RegionTerrainConfig[] {
  const slots = types.map(type => defaultRegionTerrain(type));
  while (slots.length < MAX_GEOLOGICAL_REGIONS) {
    slots.push(defaultRegionTerrain('ordinary'));
  }
  return slots;
}
