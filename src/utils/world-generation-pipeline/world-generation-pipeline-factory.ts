import { NoiseStage } from './stages/noise-stage';
import { WorldShapeStage } from './stages/world-shape-stage';
import type { WorldGeneratorConfig } from './world-generation-config';
import { WorldGenerationPipeline } from './world-generation-pipeline';
import type { WorldGenerationState } from './world-generation-state';

export function createWorldGenerationPipeline(): WorldGenerationPipeline<
  WorldGeneratorConfig,
  WorldGenerationState
> {
  return new WorldGenerationPipeline([new WorldShapeStage(), new NoiseStage()]);
}
