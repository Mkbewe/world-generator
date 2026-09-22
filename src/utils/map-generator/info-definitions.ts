import type { MapConfig } from './types';
import type { MapInfo } from '../map-layers';

interface InfoSpec {
  readonly source: string;
  readonly select: (config: MapConfig) => unknown;
}

/** Declarative list of non-raster information derived from the generation config. */
export const MAP_INFO_CATALOG = [
  {
    source: 'macroRegionLabels',
    select: (config: MapConfig) => config.macroRegions?.map(region => region.label),
  },
  {
    source: 'landmassLabels',
    select: (config: MapConfig) =>
      config.landmasses
        ? Array.from({ length: config.landmasses.count }, (_, index) => `Landmass ${index + 1}`)
        : undefined,
  },
  {
    source: 'worldDimensions',
    select: (config: MapConfig) => config.world.dimensions,
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
