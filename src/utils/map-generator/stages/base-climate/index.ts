export {
  BASE_CLIMATE_PRESETS,
  DEFAULT_BASE_CLIMATE_CONFIG,
  MAX_HEAT_ZONE_IRREGULARITY,
  MAX_HEAT_ZONES,
  MAX_OCEAN_CURRENT_RADIUS,
  MAX_OCEAN_CURRENT_SOURCES,
  MIN_HEAT_ZONES,
  baseClimatePresetConfig,
} from './defaults';
export type { BaseClimatePreset } from './defaults';
export { isBaseClimateConfig, validateBaseClimateConfig } from './config/base-climate-check';
export { createOceanCurrentSampler } from './currents';
export type { OceanCurrentDistance, OceanCurrentSample } from './currents';
export { createHeatZoneSampler } from './sampler';
export type { HeatZoneDistance } from './sampler';
export { BaseClimateStage } from './stage';
