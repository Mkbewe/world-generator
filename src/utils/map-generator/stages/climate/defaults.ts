import type { HeatZoneClass } from '../../types';

/** Normalized base temperature of each heat-zone class, 0..1. */
export const HEAT_ZONE_TEMPERATURES: Readonly<Record<HeatZoneClass, number>> = {
  cold: 0.2,
  temperate: 0.5,
  warm: 0.8,
};

/** Side of the coarse temperature grid; the map resolution caps it. */
export const CLIMATE_BASE_GRID_SIDE = 96;

/**
 * Standard deviation of the climate transition, as a share of the coarse grid
 * side. BaseClimate keeps its editable zones sharp; Climate turns them into
 * broad gradients so neighbouring cells never jump between climate classes.
 */
export const CLIMATE_BASE_BLUR_SIGMA_SHARE = 0.08;

/**
 * Temperature drop per 1000 m of elevation, in normalized 0..1 units:
 * roughly the 6.5 °C/1000 m lapse rate over a 35 °C span.
 */
export const CLIMATE_LAPSE_PER_1000_METERS = 0.18;

/** Broad temperature anomaly: one large wave across most of the world. */
export const CLIMATE_TEMPERATURE_WAVELENGTH_SHARE = 0.35;
export const CLIMATE_TEMPERATURE_OCTAVES = 3;
export const CLIMATE_TEMPERATURE_PERSISTENCE = 0.5;
export const CLIMATE_TEMPERATURE_LACUNARITY = 2;
export const CLIMATE_TEMPERATURE_STREAM = 'climate.temperature';
export const CLIMATE_TEMPERATURE_NOISE_AMPLITUDE = 0.07;

/** Domain warp: two bands bend the isotherms instead of leaving straight ramps. */
export const CLIMATE_WARP_WAVELENGTH_SHARE = 0.5;
export const CLIMATE_WARP_OCTAVES = 2;
export const CLIMATE_WARP_X_STREAM = 'climate.temperature.warpX';
export const CLIMATE_WARP_Y_STREAM = 'climate.temperature.warpY';
export const CLIMATE_WARP_AMPLITUDE = 0.08;

/** Coastal moderation: low shores and shallow water drift toward the midpoint. */
export const CLIMATE_COAST_TARGET = 0.5;
export const CLIMATE_COAST_MODERATION = 0.12;
export const CLIMATE_SHALLOW_WATER_METERS = 60;
export const CLIMATE_LOWLAND_METERS = 120;
/** Share of the world the coastline reaches inland, independent of raster resolution. */
export const CLIMATE_COAST_REACH_SHARE = 0.03;
export const CLIMATE_CURRENT_MODERATION_BOOST = 0.5;
