import type { MapConfig } from './types';

/** Non-raster facts derived from the generation config, not from a stage raster. */
export type ConfigMapInfo = Readonly<Record<string, unknown>>;

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
    source: 'worldDimensions',
    select: (config: MapConfig) => config.world.dimensions,
  },
] as const satisfies readonly InfoSpec[];

/** Selects every configured map info entry present in the given config. */
export function selectMapInfo(config: MapConfig): ConfigMapInfo {
  const info: Record<string, unknown> = {};
  for (const spec of MAP_INFO_CATALOG) {
    const value = spec.select(config);
    if (value !== undefined) {
      info[spec.source] = value;
    }
  }
  return info;
}
