import { MacroRegionStage } from './stages/macro-region-stage';
import { NoiseStage } from './stages/noise-stage';
import { WorldShapeStage } from './stages/world-shape-stage';
import { MapGenerator } from './pipeline';
import { MAP_CONFIG_KEYS, type MapStage } from './stage';
import { PIPELINE_STAGES, type PipelineStageId } from './stage-definitions';
import type { MapConfig, MapState } from './types';
import { validateDimensions } from '../world-dimensions';

const stageDelayMs = Number(import.meta.env.VITE_GENERATION_STAGE_DELAY_MS ?? 0);

const STAGE_FACTORIES: Readonly<Record<PipelineStageId, () => MapStage<MapConfig, MapState>>> = {
  'world-shape': () => new WorldShapeStage(),
  noise: () => new NoiseStage(),
  'macro-region': () => new MacroRegionStage(),
};

export function createMapGenerator(): MapGenerator<MapConfig, MapState> {
  return new MapGenerator(
    PIPELINE_STAGES.map(stage => STAGE_FACTORIES[stage.id]()),
    {
      stageDelayMs,
      validateConfig: config => validateDimensions(config.world.dimensions),
      knownConfigKeys: MAP_CONFIG_KEYS,
    }
  );
}
