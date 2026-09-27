import type { HeightmapConfig } from '../../types';

/** Whether unknown data is a heightmap configuration within its domain limits. */
export function isHeightmapConfig(value: unknown): value is HeightmapConfig {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const config = value as Record<string, unknown>;
  return isNormalized(config.relief) && isNormalized(config.featureScale);
}

function isNormalized(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}
