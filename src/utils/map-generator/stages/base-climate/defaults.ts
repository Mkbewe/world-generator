import type {
  BaseClimateConfig,
  HeatZoneClass,
  HeatZoneConfig,
  OceanCurrentConfig,
  WorldPoint,
} from '../../types';

/** Bounds of the editable heat-zone list. */
export const MIN_HEAT_ZONES = 1;
export const MAX_HEAT_ZONES = 32;

/** Bounds of the static ocean-current sources. */
export const MAX_OCEAN_CURRENT_SOURCES = 16;
export const MAX_OCEAN_CURRENT_RADIUS = 2;

/** How far heat-zone borders may bend; 0 keeps the geometric lines. */
export const MAX_HEAT_ZONE_IRREGULARITY = 0.2;

/** Independent base-moisture FBM: one broad wave across most of the world. */
export const BASE_MOISTURE_WAVELENGTH_SHARE = 0.4;
export const BASE_MOISTURE_OCTAVES = 4;
export const BASE_MOISTURE_PERSISTENCE = 0.5;
export const BASE_MOISTURE_LACUNARITY = 2;
export const BASE_MOISTURE_STREAM = 'base-climate.moisture';

export const BASE_CLIMATE_PRESETS = ['earth-like', 'ring-world', 'cold-core'] as const;

export type BaseClimatePreset = (typeof BASE_CLIMATE_PRESETS)[number];

const WORLD_CENTRE: WorldPoint = { x: 0.5, y: 0.5 };

function band(
  id: string,
  label: string,
  thermal: HeatZoneClass,
  center: number,
  width: number
): HeatZoneConfig {
  return {
    id,
    label,
    thermal,
    geometry: { kind: 'band', axis: 'y', center, width },
  };
}

function ring(
  id: string,
  label: string,
  thermal: HeatZoneClass,
  innerRadius: number,
  outerRadius: number
): HeatZoneConfig {
  return {
    id,
    label,
    thermal,
    geometry: { kind: 'ring', center: WORLD_CENTRE, innerRadius, outerRadius },
  };
}

function current(
  x: number,
  y: number,
  flow: OceanCurrentConfig['flow'],
  strength: number,
  radius: number
): OceanCurrentConfig {
  return { center: { x, y }, flow, strength, radius };
}

const PRESET_CURRENTS: Readonly<Record<BaseClimatePreset, readonly OceanCurrentConfig[]>> = {
  'earth-like': [
    current(0.25, 0.3, 'clockwise', 0.8, 0.4),
    current(0.75, 0.3, 'clockwise', 0.8, 0.4),
    current(0.25, 0.7, 'counterclockwise', 0.8, 0.4),
    current(0.75, 0.7, 'counterclockwise', 0.8, 0.4),
  ],
  'ring-world': [
    current(0.5, 0.5, 'outward', 0.55, 0.75),
    current(0.5, 0.5, 'clockwise', 0.45, 0.75),
  ],
  'cold-core': [current(0.5, 0.5, 'inward', 0.8, 0.75)],
};

const PRESET_ZONES: Readonly<Record<BaseClimatePreset, readonly HeatZoneConfig[]>> = {
  'earth-like': [
    band('polar-north', 'Polar north', 'cold', 0.1, 0.2),
    band('temperate-north', 'Temperate north', 'temperate', 0.3, 0.2),
    band('equatorial', 'Equatorial', 'warm', 0.5, 0.2),
    band('temperate-south', 'Temperate south', 'temperate', 0.7, 0.2),
    band('polar-south', 'Polar south', 'cold', 0.9, 0.2),
  ],
  'ring-world': [
    ring('temperate-core', 'Temperate core', 'temperate', 0, 0.2),
    ring('warm-ring', 'Warm ring', 'warm', 0.2, 0.35),
    ring('cold-rim', 'Cold rim', 'cold', 0.35, 0.5),
  ],
  'cold-core': [
    ring('cold-core', 'Cold core', 'cold', 0, 0.2),
    ring('temperate-ring', 'Temperate ring', 'temperate', 0.2, 0.35),
    ring('warm-rim', 'Warm rim', 'warm', 0.35, 0.5),
  ],
};

/** The layout a fresh world starts from; every call returns independent data. */
export function baseClimatePresetConfig(preset: BaseClimatePreset): BaseClimateConfig {
  return {
    geologyCoupling: 1,
    moisture: 0.5,
    zoneIrregularity: 0,
    zones: PRESET_ZONES[preset].map(zone => ({
      ...zone,
      geometry:
        zone.geometry.kind === 'ring'
          ? { ...zone.geometry, center: { ...zone.geometry.center } }
          : { ...zone.geometry },
    })),
    currents: PRESET_CURRENTS[preset].map(source => ({
      ...source,
      center: { ...source.center },
    })),
  };
}

export const DEFAULT_BASE_CLIMATE_CONFIG: BaseClimateConfig = baseClimatePresetConfig('ring-world');
