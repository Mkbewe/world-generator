/** Dotted `MapConfig` paths a stage may declare as its inputs. */
export const MAP_CONFIG_KEYS = [
  'world.seed',
  'world.shape',
  'world.dimensions',
  'noise',
  'macroRegions',
  'macroRegionDeformation',
  'landmasses',
] as const;

export type MapConfigKey = (typeof MAP_CONFIG_KEYS)[number];

export interface StageInfo {
  readonly id: string;
  readonly name: string;
}

/**
 * A stage of the canonical pipeline: its identity and the configuration its
 * output depends on. The keys cover what a stage inherits through the rasters
 * of earlier stages too, so a change recomputes exactly the stages that list
 * the changed slice.
 */
export interface StageDefinition extends StageInfo {
  readonly configKeys: readonly MapConfigKey[];
}

export const WORLD_SHAPE_STAGE = {
  id: 'world-shape',
  name: 'World shape generation',
  configKeys: ['world.dimensions', 'world.shape'],
} as const satisfies StageDefinition;

/** The noise skips cells outside the mask, so it depends on the world shape. */
export const NOISE_STAGE = {
  id: 'noise',
  name: 'Noise generation',
  configKeys: ['world.seed', 'world.shape', 'world.dimensions', 'noise'],
} as const satisfies StageDefinition;

/** Regions read the mask and sample the noise raster for the `noise-map` source. */
export const MACRO_REGION_STAGE = {
  id: 'macro-region',
  name: 'Macro region generation',
  configKeys: [
    'world.seed',
    'world.shape',
    'world.dimensions',
    'noise',
    'macroRegions',
    'macroRegionDeformation',
  ],
} as const satisfies StageDefinition;

export const LANDMASS_LAYOUT_STAGE = {
  id: 'landmass-layout',
  name: 'Landmass layout generation',
  configKeys: ['world.seed', 'world.shape', 'world.dimensions', 'landmasses'],
} as const satisfies StageDefinition;

/**
 * Canonical pipeline order and the single place to change it. The generator,
 * the settings tabs and the preview layer tabs all follow this list.
 */
export const PIPELINE_STAGES = [
  WORLD_SHAPE_STAGE,
  NOISE_STAGE,
  MACRO_REGION_STAGE,
  LANDMASS_LAYOUT_STAGE,
] as const;

export type PipelineStageId = (typeof PIPELINE_STAGES)[number]['id'];
