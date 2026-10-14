export {
  DEFAULT_GEOLOGY_CONFIG,
  GEOLOGY_PRESETS,
  defaultRegionConfig,
  defaultRegionSlots,
  geologyPresetConfig,
} from './config/presets';
export type { GeologyPreset } from './config/presets';
export { GeologyStage } from './stage';
export { buildGeologyPlan } from './plan';
export {
  isGeologyConfig,
  isGeologyPlan,
  validateGeologyConfig,
  validateGeologyPlan,
} from './config/geology-check';
export {
  MAX_GEOLOGICAL_REGIONS,
  MAX_REGION_SIZE,
  MIN_GEOLOGICAL_REGIONS,
  MIN_REGION_SIZE,
} from './defaults';
