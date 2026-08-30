import { NoiseStage } from './stages/noise-stage';
import { WorldShapeStage } from './stages/world-shape-stage';
import { MapGenerator } from './pipeline';
import type { MapConfig, MapState } from './types';

export function createMapGenerator(): MapGenerator<MapConfig, MapState> {
  return new MapGenerator([new WorldShapeStage(), new NoiseStage()]);
}
