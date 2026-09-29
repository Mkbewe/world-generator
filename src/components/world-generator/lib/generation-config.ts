import type {
  GeologyConfig,
  HeightmapConfig,
  MacroRegionConfig,
  MacroRegionDeformation,
  MapConfig,
  NoiseConfig,
} from '../../../utils/map-generator';
import {
  createGeographyPreset,
  type GeographyPresetId,
} from '../../../utils/map-generator/stages/geology';
import { summarizeWorldGrid } from '../../../utils/world-grid';

export interface GenerationConfigInput {
  seed: string;
  shape: MapConfig['world']['shape'];
  sizeMeters: number;
  metersPerSample: number;
  noise: NoiseConfig;
  macroRegions: readonly MacroRegionConfig[];
  macroRegionDeformation: MacroRegionDeformation;
  geology: GeologyConfig;
  geographyPreset?: GeographyPresetId;
  heightmap: HeightmapConfig;
}

export type GenerationConfigResult = { config: MapConfig } | { error: string };

/** Turns the generator form values into the config accepted by the worker. */
export function buildGenerationConfig(input: GenerationConfigInput): GenerationConfigResult {
  const parsedSeed = Number(input.seed);
  if (input.seed.trim() === '' || !Number.isSafeInteger(parsedSeed)) {
    return { error: 'Seed must be an integer.' };
  }

  const grid = summarizeWorldGrid(input.sizeMeters, input.metersPerSample);
  return {
    config: {
      world: { dimensions: grid.dimensions, seed: parsedSeed, shape: input.shape },
      noise: input.noise,
      macroRegions: input.macroRegions,
      macroRegionDeformation: input.macroRegionDeformation,
      geology: input.geographyPreset
        ? createGeographyPreset(input.geographyPreset, parsedSeed, grid.dimensions, input.shape)
        : input.geology,
      heightmap: input.heightmap,
    },
  };
}
