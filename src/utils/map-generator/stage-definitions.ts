export interface StageInfo {
  readonly id: string;
  readonly name: string;
}

export const WORLD_SHAPE_STAGE: StageInfo = {
  id: 'world-shape',
  name: 'World shape generation',
};

export const NOISE_STAGE: StageInfo = {
  id: 'noise',
  name: 'Noise generation',
};

export const MAP_STAGES: readonly StageInfo[] = [WORLD_SHAPE_STAGE, NOISE_STAGE];
