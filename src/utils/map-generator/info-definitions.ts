import { DEFAULT_BASE_CLIMATE_CONFIG } from './stages/base-climate/defaults';
import { DEFAULT_MACRO_REGIONS } from './stages/macro-region/defaults';
import {
  HEAT_ZONE_CLASSES,
  type HeatZoneClass,
  type MacroRegionGeometry,
  type MapConfig,
} from './types';

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

/** What the preview knows about one heat zone; indexed like `heatZoneMap`. */
export interface HeatZoneInfo {
  readonly id: string;
  readonly label: string;
  readonly thermal: HeatZoneClass;
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
    source: 'heatZoneInfo',
    select: (config: MapConfig) =>
      (config.baseClimate ?? DEFAULT_BASE_CLIMATE_CONFIG).zones.map(zone => ({
        id: zone.id,
        label: zone.label,
        thermal: zone.thermal,
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

/** Narrows one persisted heat-zone entry. */
export function isHeatZoneInfo(value: unknown): value is HeatZoneInfo {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { id, label, thermal } = value as Record<string, unknown>;
  return (
    typeof id === 'string' &&
    typeof label === 'string' &&
    HEAT_ZONE_CLASSES.some(value => value === thermal)
  );
}

/** Narrows a validated heat-zone list; indices stay stable for `heatZoneMap`. */
export function isHeatZoneInfoList(value: unknown): value is readonly HeatZoneInfo[] {
  return Array.isArray(value) && value.every(isHeatZoneInfo);
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
