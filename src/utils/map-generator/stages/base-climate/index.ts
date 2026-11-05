export {
  BASE_CLIMATE_PRESETS,
  DEFAULT_BASE_CLIMATE_CONFIG,
  MAX_HEAT_ZONES,
  MIN_HEAT_ZONES,
  baseClimatePresetConfig,
} from './defaults';
export type { BaseClimatePreset } from './defaults';
export { isBaseClimateConfig, validateBaseClimateConfig } from './config/base-climate-check';
export { createHeatZoneSampler } from './sampler';
export type { HeatZoneDistance } from './sampler';
export { BaseClimateStage } from './stage';
