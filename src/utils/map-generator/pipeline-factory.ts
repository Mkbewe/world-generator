import { NoiseStage } from './stages/noise-stage';
import { WorldShapeStage } from './stages/world-shape-stage';
import { MapGenerator } from './pipeline';
import type { MapConfig, MapState } from './types';

const stageDelayMs = Number(import.meta.env.VITE_GENERATION_STAGE_DELAY_MS ?? 0);

export function createMapGenerator(): MapGenerator<MapConfig, MapState> {
  return new MapGenerator([new WorldShapeStage(), new NoiseStage()], { stageDelayMs });
}
