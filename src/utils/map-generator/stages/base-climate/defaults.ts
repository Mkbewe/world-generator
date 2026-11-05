import type { BaseClimateConfig, HeatZoneClass, HeatZoneConfig, WorldPoint } from '../../types';

/** Bounds of the editable heat-zone list. */
export const MIN_HEAT_ZONES = 1;
export const MAX_HEAT_ZONES = 32;

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

const PRESET_ZONES: Readonly<Record<BaseClimatePreset, readonly HeatZoneConfig[]>> = {
  'earth-like': [
    band('polar-north', 'Polar north', 'cold', 0.1, 0.2),
    band('temperate-north', 'Temperate north', 'temperate', 0.3, 0.2),
    band('equatorial', 'Equatorial', 'warm', 0.5, 0.2),
    band('temperate-south', 'Temperate south', 'temperate', 0.7, 0.2),
    band('polar-south', 'Polar south', 'cold', 0.9, 0.2),
  ],
  'ring-world': [
    ring('warm-core', 'Warm core', 'warm', 0, 0.35),
    ring('temperate-ring', 'Temperate ring', 'temperate', 0.35, 0.65),
    ring('cold-rim', 'Cold rim', 'cold', 0.65, 1.5),
  ],
  'cold-core': [
    ring('cold-core', 'Cold core', 'cold', 0, 0.35),
    ring('temperate-ring', 'Temperate ring', 'temperate', 0.35, 0.65),
    ring('warm-rim', 'Warm rim', 'warm', 0.65, 1.5),
  ],
};

/** The layout a fresh world starts from; every call returns independent data. */
export function baseClimatePresetConfig(preset: BaseClimatePreset): BaseClimateConfig {
  return {
    geologyCoupling: 1,
    zones: PRESET_ZONES[preset].map(zone => ({
      ...zone,
      geometry:
        zone.geometry.kind === 'ring'
          ? { ...zone.geometry, center: { ...zone.geometry.center } }
          : { ...zone.geometry },
    })),
  };
}

export const DEFAULT_BASE_CLIMATE_CONFIG: BaseClimateConfig = baseClimatePresetConfig('earth-like');
