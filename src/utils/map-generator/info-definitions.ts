import type { MapConfig, WorldConfig } from './types';
import type { MapInfo } from '../map-layers';
import {
  dimensionsFromMeters,
  validateDimensions,
  type WorldDimensions,
} from '../world-dimensions';

interface InfoSpec {
  readonly source: string;
  readonly select: (config: MapConfig) => unknown;
}

/** Physical dimensions derived from the sample grid and the detail per sample. */
export function resolveWorldDimensions(world: WorldConfig): WorldDimensions {
  const metersPerSample = world.metersPerSample ?? 1;
  const dimensions = dimensionsFromMeters({
    widthMeters: world.width * metersPerSample,
    heightMeters: world.height * metersPerSample,
    metersPerSample,
  });
  validateDimensions(dimensions);
  return dimensions;
}

/** Declarative list of non-raster information derived from the generation config. */
export const MAP_INFO_CATALOG = [
  {
    source: 'macroRegionLabels',
    select: (config: MapConfig) => config.macroRegions?.map(region => region.label),
  },
  {
    source: 'worldDimensions',
    select: (config: MapConfig) => resolveWorldDimensions(config.world),
  },
] as const satisfies readonly InfoSpec[];

/** Selects every configured map info entry present in the given config. */
export function selectMapInfo(config: MapConfig): MapInfo {
  const info: Record<string, unknown> = {};
  for (const spec of MAP_INFO_CATALOG) {
    const value = spec.select(config);
    if (value !== undefined) {
      info[spec.source] = value;
    }
  }
  return info;
}
