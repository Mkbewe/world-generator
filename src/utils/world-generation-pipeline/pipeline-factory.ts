import { NoiseStage } from './stages/noise-stage';
import { WorldShapeStage } from './stages/world-shape-stage';
import { WorldGenerationPipeline } from './pipeline';
import type { WorldGenerationState, WorldGeneratorConfig } from './types';

export function createWorldGenerationPipeline(): WorldGenerationPipeline<
  WorldGeneratorConfig,
  WorldGenerationState
> {
  return new WorldGenerationPipeline([new WorldShapeStage(), new NoiseStage()]);
}
