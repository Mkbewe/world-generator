import { DEFAULT_MACRO_REGIONS } from './stages/macro-region/defaults';
import type { MacroRegionGeometry, MapConfig } from './types';

/** Non-raster facts derived from the generation config, not from a stage raster. */
export type ConfigMapInfo = Readonly<Record<string, unknown>>;

/** What the readout knows about one macro region; indexed like the region raster. */
export interface MacroRegionInfo {
  readonly label: string;
  readonly role: 'base' | 'overlay';
  readonly danger: number;
  readonly kind: MacroRegionGeometry['kind'];
  /** Normalized start and end: radius for rings, axis position for bands. */
  readonly range: readonly [number, number];
}

interface InfoSpec {
  readonly source: string;
  readonly select: (config: MapConfig) => unknown;
}

/** Declarative list of non-raster information derived from the generation config. */
export const MAP_INFO_CATALOG = [
  {
    source: 'macroRegionInfo',
    select: (config: MapConfig) =>
      (config.macroRegions ?? DEFAULT_MACRO_REGIONS).map(region => ({
        label: region.label,
        role: region.role,
        danger: region.danger,
        kind: region.geometry.kind,
        range: geometryRange(region.geometry),
      })),
  },
  {
    source: 'worldDimensions',
    select: (config: MapConfig) => config.world.dimensions,
  },
] as const satisfies readonly InfoSpec[];

function geometryRange(geometry: MacroRegionGeometry): readonly [number, number] {
  if (geometry.kind === 'ring') {
    return [geometry.innerRadius, geometry.outerRadius];
  }
  return [geometry.center - geometry.width / 2, geometry.center + geometry.width / 2];
}

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
