import type { ConditionalRead, MapConfig, MapState } from './types';

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

/** Shape checked on each stage constant before the id union is derived from the list. */
interface DeclaredStage {
  readonly id: string;
  readonly name: string;
  readonly configKeys: readonly MapConfigKey[];
  readonly conditionalKeys?: readonly ConditionalConfigKey[];
  readonly conditionalReads?: readonly ConditionalRead<MapConfig, MapState>[];
}

/**
 * A configuration slice a stage reads only while the config selects it.
 * Selective regeneration recomputes the stage on a change of `key` only when
 * `when` holds for the previous or the next configuration.
 */
export interface ConditionalConfigKey {
  readonly key: MapConfigKey;
  readonly when: (config: Readonly<MapConfig>) => boolean;
}

export const WORLD_SHAPE_STAGE = {
  id: 'world-shape',
  name: 'World shape generation',
  configKeys: ['world.dimensions', 'world.shape'],
} as const satisfies DeclaredStage;

/** The noise skips cells outside the mask, so it depends on the world shape. */
export const NOISE_STAGE = {
  id: 'noise',
  name: 'Noise generation',
  configKeys: ['world.seed', 'world.shape', 'world.dimensions', 'noise'],
} as const satisfies DeclaredStage;

/** Whether a config deforms macro-region borders by sampling the noise raster. */
export function usesNoiseMapForRegions(config: Readonly<MapConfig>): boolean {
  return (config.macroRegionDeformation?.source ?? 'dedicated') === 'noise-map';
}

/** Regions read the mask and sample the noise raster for the `noise-map` source. */
export const MACRO_REGION_STAGE = {
  id: 'macro-region',
  name: 'Macro region generation',
  configKeys: [
    'world.seed',
    'world.shape',
    'world.dimensions',
    'macroRegions',
    'macroRegionDeformation',
  ],
  conditionalKeys: [
    {
      // An omitted source means the dedicated region noise, which never reads
      // the noise raster — so a noise change alone must not dirty this stage.
      key: 'noise',
      when: usesNoiseMapForRegions,
    },
  ],
  conditionalReads: [{ key: 'noiseMap', when: usesNoiseMapForRegions }],
} as const satisfies DeclaredStage;

export const LANDMASS_LAYOUT_STAGE = {
  id: 'landmass-layout',
  name: 'Landmass layout generation',
  configKeys: ['world.seed', 'world.shape', 'world.dimensions', 'landmasses'],
} as const satisfies DeclaredStage;

/**
 * Presentation order of the canonical pipeline: settings tabs, preview layers
 * and the layer catalog follow this list. Execution order is derived from the
 * stages' declared reads/writes (see pipeline-factory), so moving an entry
 * here never breaks the data flow.
 */
export const PIPELINE_STAGES = [
  WORLD_SHAPE_STAGE,
  NOISE_STAGE,
  MACRO_REGION_STAGE,
  LANDMASS_LAYOUT_STAGE,
] as const;

export type PipelineStageId = (typeof PIPELINE_STAGES)[number]['id'];

export interface StageInfo {
  readonly id: PipelineStageId;
  readonly name: string;
}

/**
 * A stage of the canonical pipeline: its identity and the configuration its
 * output depends on. The keys cover what a stage inherits through the outputs
 * of earlier stages too, so a change recomputes exactly the stages that list
 * the changed slice — unconditionally via `configKeys`, or only while the
 * config selects the dependency via `conditionalKeys`. `conditionalReads`
 * is the data twin of the latter: state the stage reads only while selected.
 */
export interface StageDefinition extends StageInfo {
  readonly configKeys: readonly MapConfigKey[];
  readonly conditionalKeys?: readonly ConditionalConfigKey[];
  readonly conditionalReads?: readonly ConditionalRead<MapConfig, MapState>[];
}

const stageDefinitions: readonly StageDefinition[] = PIPELINE_STAGES;

/** Narrows a worker or message id to a stage of the canonical pipeline. */
export function isPipelineStageId(value: string): value is PipelineStageId {
  return stageDefinitions.some(stage => stage.id === value);
}
