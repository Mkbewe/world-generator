import { LandmassLayoutStage } from './stages/landmass-layout';
import { MacroRegionStage } from './stages/macro-region-stage';
import { NoiseStage } from './stages/noise-stage';
import { WorldShapeStage } from './stages/world-shape-stage';
import { MapGenerator } from './pipeline';
import { createWorldSpace } from './space';
import { type MapStage, resolveReads } from './stage';
import { MAP_CONFIG_KEYS, PIPELINE_STAGES, type PipelineStageId } from './stage-definitions';
import type { MapConfig, MapState, StageData } from './types';
import { validateDimensions } from '../world-dimensions';

const stageDelayMs = Number(import.meta.env.VITE_GENERATION_STAGE_DELAY_MS ?? 0);

const STAGE_FACTORIES: Readonly<
  Record<PipelineStageId, () => MapStage<MapConfig, MapState, PipelineStageId, StageData>>
> = {
  'world-shape': () => new WorldShapeStage(),
  noise: () => new NoiseStage(),
  'macro-region': () => new MacroRegionStage(),
  'landmass-layout': () => new LandmassLayoutStage(),
};

export function createMapGenerator(): MapGenerator<MapConfig, MapState, PipelineStageId> {
  return new MapGenerator(
    orderByDataDependencies(PIPELINE_STAGES.map(stage => STAGE_FACTORIES[stage.id]())),
    {
      stageDelayMs,
      validateConfig: config => validateDimensions(config.world.dimensions),
      knownConfigKeys: MAP_CONFIG_KEYS,
      createSpace: config => createWorldSpace(config.world.dimensions),
    }
  );
}

/**
 * Execution order derived from the data graph: a stage runs once every state
 * key it reads — including conditional edges — is written by an earlier
 * stage. Reads with no writer anywhere are external inputs (the reuse cache
 * provides them). Stable: independent stages keep their presentation order.
 * A cycle fails loudly instead of deadlocking the worker.
 */
function orderByDataDependencies(
  stages: readonly MapStage<MapConfig, MapState, PipelineStageId, StageData>[]
): MapStage<MapConfig, MapState, PipelineStageId, StageData>[] {
  const writers = new Set<keyof MapState>();
  for (const stage of stages) {
    for (const key of stage.writes ?? []) {
      writers.add(key);
    }
  }
  const remaining = [...stages];
  const ordered: MapStage<MapConfig, MapState, PipelineStageId, StageData>[] = [];
  const available = new Set<keyof MapState>();
  while (remaining.length > 0) {
    const next = remaining.findIndex(stage =>
      resolveReads(stage).every(key => available.has(key) || !writers.has(key))
    );
    if (next < 0) {
      throw new Error(
        `Pipeline stages have a dependency cycle: ${remaining.map(stage => stage.id).join(', ')}.`
      );
    }
    const [stage] = remaining.splice(next, 1);
    ordered.push(stage);
    for (const key of stage.writes ?? []) {
      available.add(key);
    }
  }
  return ordered;
}
