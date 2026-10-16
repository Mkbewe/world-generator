import type { HeightmapConfig } from '../../../types';
import { MAX_ISLET_FREQUENCY, MAX_RELIEF, MIN_ISLET_FREQUENCY, MIN_RELIEF } from '../defaults';

/** Whether unknown data is a heightmap configuration within its domain limits. */
export function isHeightmapConfig(value: unknown): value is HeightmapConfig {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const config = value as Record<string, unknown>;
  return (
    isWithin(config.relief, MIN_RELIEF, MAX_RELIEF) &&
    isWithin(config.isletFrequency, MIN_ISLET_FREQUENCY, MAX_ISLET_FREQUENCY) &&
    isRegionTerrains(config.regions)
  );
}

/** The optional terrain list: absent is allowed, present must be unit records. */
function isRegionTerrains(value: unknown): boolean {
  if (value === undefined) {
    return true;
  }
  return Array.isArray(value) && value.every(isRegionTerrain);
}

function isRegionTerrain(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const terrain = value as Record<string, unknown>;
  return (
    isWithin(terrain.landShare, 0, 1) &&
    isWithin(terrain.concentration, 0, 1) &&
    isWithin(terrain.clustering, 0, 1) &&
    isWithin(terrain.age, 0, 1) &&
    isWithin(terrain.mountainousness, 0, 1) &&
    isWithin(terrain.ringShare, 0, 1)
  );
}

function isWithin(value: unknown, minimum: number, maximum: number): value is number {
  return (
    typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum
  );
}
