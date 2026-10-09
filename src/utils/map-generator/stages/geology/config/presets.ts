import type {
  GeologicalRegionConfig,
  GeologicalRegionType,
  GeologyConfig,
  GeologyLayoutConfig,
} from '../../../types';
import { MAX_GEOLOGICAL_REGIONS } from '../defaults';

/** Starter configurations offered by the Geology form. */
export const GEOLOGY_PRESETS = ['varied', 'oceanic', 'vast', 'mosaic'] as const;

export type GeologyPreset = (typeof GEOLOGY_PRESETS)[number];

interface PresetRegion {
  readonly type: GeologicalRegionType;
  readonly size: number;
}

/** Hand-tuned, seed-independent regions of every preset. */
const PRESET_REGIONS: Readonly<Record<GeologyPreset, readonly PresetRegion[]>> = {
  varied: [
    { type: 'ordinary', size: 1.2 },
    { type: 'volcanic', size: 0.9 },
    { type: 'ordinary', size: 1 },
    { type: 'atoll', size: 0.8 },
    { type: 'ordinary', size: 1.1 },
  ],
  oceanic: [
    { type: 'atoll', size: 0.8 },
    { type: 'ordinary', size: 0.9 },
    { type: 'volcanic', size: 0.7 },
    { type: 'atoll', size: 0.9 },
    { type: 'volcanic', size: 0.8 },
    { type: 'ordinary', size: 1 },
    { type: 'atoll', size: 0.7 },
  ],
  vast: [
    { type: 'ordinary', size: 1.4 },
    { type: 'volcanic', size: 1 },
  ],
  mosaic: [
    { type: 'ordinary', size: 0.8 },
    { type: 'volcanic', size: 1.1 },
    { type: 'atoll', size: 0.9 },
    { type: 'ordinary', size: 1.3 },
    { type: 'volcanic', size: 0.85 },
    { type: 'atoll', size: 1 },
    { type: 'ordinary', size: 1.2 },
    { type: 'volcanic', size: 0.75 },
    { type: 'atoll', size: 1.05 },
  ],
};

const PRESET_LAYOUTS: Readonly<Record<GeologyPreset, GeologyLayoutConfig>> = {
  varied: { evenness: 0.6, irregularity: 0.45 },
  oceanic: { evenness: 0.5, irregularity: 0.6 },
  vast: { evenness: 0.4, irregularity: 0.25 },
  mosaic: { evenness: 0.75, irregularity: 0.7 },
};

/** The configuration a fresh session starts from. */
export const DEFAULT_GEOLOGY_CONFIG: GeologyConfig = geologyPresetConfig('varied');

/** Fills one editable configuration from a preset; every call returns a copy. */
export function geologyPresetConfig(preset: GeologyPreset): GeologyConfig {
  const regions = PRESET_REGIONS[preset];
  return {
    regionCount: regions.length,
    layout: { ...PRESET_LAYOUTS[preset] },
    regions: regions.map(region => ({ ...region })),
  };
}

/** One neutral region used by slots the user has not edited yet. */
export function defaultRegionConfig(): GeologicalRegionConfig {
  return { type: 'ordinary', size: 1 };
}

/** Editable slots of a fresh configuration: the default preset padded to the limit. */
export function defaultRegionSlots(): readonly GeologicalRegionConfig[] {
  const slots = DEFAULT_GEOLOGY_CONFIG.regions.map(region => ({ ...region }));
  while (slots.length < MAX_GEOLOGICAL_REGIONS) {
    slots.push(defaultRegionConfig());
  }
  return slots;
}
