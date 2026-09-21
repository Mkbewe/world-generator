export interface StageInfo {
  readonly id: string;
  readonly name: string;
}

export const WORLD_SHAPE_STAGE = {
  id: 'world-shape',
  name: 'World shape generation',
} as const satisfies StageInfo;

export const NOISE_STAGE = {
  id: 'noise',
  name: 'Noise generation',
} as const satisfies StageInfo;

export const MACRO_REGION_STAGE = {
  id: 'macro-region',
  name: 'Macro region generation',
} as const satisfies StageInfo;

/**
 * Canonical pipeline order and the single place to change it. The generator,
 * the settings tabs and the preview layer tabs all follow this list.
 */
export const PIPELINE_STAGES = [WORLD_SHAPE_STAGE, NOISE_STAGE, MACRO_REGION_STAGE] as const;

export type PipelineStageId = (typeof PIPELINE_STAGES)[number]['id'];
