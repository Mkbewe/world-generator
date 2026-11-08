import { DEFAULT_BASE_CLIMATE_CONFIG } from './stages/base-climate/defaults';
import { DEFAULT_MACRO_REGIONS } from './stages/macro-region/defaults';
import {
  GEOLOGICAL_REGION_TYPES,
  type GeologicalRegionType,
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

/** Narrowed geology region metadata the readout consumes. */
export interface GeologyRegionInfo {
  readonly id: string;
  readonly type: GeologicalRegionType;
  readonly areaSquareMeters?: number;
}

/** Narrowed geology metadata the readout consumes, without the rasters. */
export interface GeologyInfo {
  readonly regions: readonly GeologyRegionInfo[];
  readonly worldAreaSquareMeters?: number;
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

/** Narrows one persisted macro-region entry. */
export function isMacroRegionInfo(value: unknown): value is MacroRegionInfo {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { label, role, danger, kind, range } = value as Record<string, unknown>;
  return (
    typeof label === 'string' &&
    (role === 'base' || role === 'overlay') &&
    typeof danger === 'number' &&
    Number.isFinite(danger) &&
    (kind === 'ring' || kind === 'band') &&
    Array.isArray(range) &&
    range.length === 2 &&
    range.every(entry => typeof entry === 'number' && Number.isFinite(entry))
  );
}

/** Narrows a validated macro-region list; indices stay stable for the raster. */
export function isMacroRegionInfoList(value: unknown): value is readonly MacroRegionInfo[] {
  return Array.isArray(value) && value.every(isMacroRegionInfo);
}

/** Narrows the geology metadata the readout needs, without validating every raster. */
export function isGeologyInfo(value: unknown): value is GeologyInfo {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { regions, worldAreaSquareMeters } = value as Record<string, unknown>;
  if (!Array.isArray(regions) || !regions.every(isGeologicalRegionInfo)) {
    return false;
  }
  return (
    worldAreaSquareMeters === undefined ||
    (typeof worldAreaSquareMeters === 'number' && Number.isFinite(worldAreaSquareMeters))
  );
}

function isGeologicalRegionInfo(value: unknown): value is GeologyRegionInfo {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { id, type, areaSquareMeters } = value as Record<string, unknown>;
  if (typeof id !== 'string' || !isGeologicalRegionType(type)) {
    return false;
  }
  return (
    areaSquareMeters === undefined ||
    (typeof areaSquareMeters === 'number' && Number.isFinite(areaSquareMeters))
  );
}

function isGeologicalRegionType(value: unknown): value is GeologicalRegionType {
  return GEOLOGICAL_REGION_TYPES.some(type => type === value);
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
