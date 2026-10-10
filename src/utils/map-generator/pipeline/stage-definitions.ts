/** Dotted `MapConfig` paths a stage may declare as its inputs. */
export const MAP_CONFIG_KEYS = [
  'world.seed',
  'world.shape',
  'world.dimensions',
  'macroRegions',
  'macroRegionDeformation',
  'geology',
] as const;

export type MapConfigKey = (typeof MAP_CONFIG_KEYS)[number];

/** Shape checked on each stage constant before the id union is derived from the list. */
interface DeclaredStage {
  readonly id: string;
  readonly name: string;
  readonly configKeys: readonly MapConfigKey[];
}

export const WORLD_SHAPE_STAGE = {
  id: 'world-shape',
  name: 'World shape',
  configKeys: ['world.dimensions', 'world.shape'],
} as const satisfies DeclaredStage;

/** Regions read the mask and carry their own deterministic border noise. */
export const MACRO_REGION_STAGE = {
  id: 'macro-region',
  name: 'Macro region',
  configKeys: [
    'world.seed',
    'world.shape',
    'world.dimensions',
    'macroRegions',
    'macroRegionDeformation',
  ],
} as const satisfies DeclaredStage;

/**
 * The geology stage plans the regions and rasterises their owner and border
 * distance maps at the sample resolution; both the sample counts and the
 * physical size shape that raster.
 */
export const GEOLOGY_STAGE = {
  id: 'geology',
  name: 'Geology',
  configKeys: ['world.seed', 'world.shape', 'world.dimensions', 'geology'],
} as const satisfies DeclaredStage;

/**
 * Presentation order of the canonical pipeline: settings tabs, preview layers
 * and the layer catalog follow this list. Execution order is derived from the
 * stages' declared reads/writes (see pipeline-factory), so moving an entry
 * here never breaks the data flow.
 */
export const PIPELINE_STAGES = [WORLD_SHAPE_STAGE, MACRO_REGION_STAGE, GEOLOGY_STAGE] as const;

export type PipelineStageId = (typeof PIPELINE_STAGES)[number]['id'];

export interface StageInfo {
  readonly id: PipelineStageId;
  readonly name: string;
}

/**
 * A stage of the canonical pipeline: its identity and the configuration its
 * output depends on. The keys cover what a stage inherits through the outputs
 * of earlier stages too, so a change recomputes exactly the stages that list
 * the changed slice.
 */
export interface StageDefinition extends StageInfo {
  readonly configKeys: readonly MapConfigKey[];
}

const stageDefinitions: readonly StageDefinition[] = PIPELINE_STAGES;

/** Narrows a worker or message id to a stage of the canonical pipeline. */
export function isPipelineStageId(value: string): value is PipelineStageId {
  return stageDefinitions.some(stage => stage.id === value);
}
