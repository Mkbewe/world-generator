import { isGeologyPlan, validateGeologyConfig } from './config/geology-check';
import { DEFAULT_GEOLOGY_CONFIG } from './config/presets';
import { buildGeologyPlan } from './plan';
import { createThermalAt } from './thermal';
import { GenerationCancelledError } from '../../errors';
import type { MapContext } from '../../pipeline/context';
import { type MapStage } from '../../pipeline/stage';
import { GEOLOGY_STAGE } from '../../pipeline/stage-definitions';
import { spaceOf } from '../../space';
import type {
  GeologicalRegionType,
  GeologyPlan,
  MapConfig,
  MapState,
  StageMetrics,
  StageProgressReporter,
} from '../../types';
import { DEFAULT_BASE_CLIMATE_CONFIG } from '../base-climate';

/** Progress reported before the plan itself is built. */
const PLAN_PROGRESS = 0.1;

/**
 * Plans the full-world region partition and its ownership raster. Terrain
 * features inside the regions belong to later stages.
 */
export class GeologyStage implements MapStage<
  MapConfig,
  MapState,
  string,
  { geologyPlan: GeologyPlan }
> {
  readonly id = GEOLOGY_STAGE.id;
  readonly name = GEOLOGY_STAGE.name;
  readonly configKeys = GEOLOGY_STAGE.configKeys;
  readonly reads: readonly (keyof MapState)[] = ['heatZoneMap'];
  readonly writes = ['geologyPlan'] as const;
  readonly progressStep = 0.1;

  async execute(
    context: MapContext<MapConfig, MapState, string>,
    signal: AbortSignal,
    report: StageProgressReporter
  ): Promise<{ geologyPlan: GeologyPlan }> {
    const config = context.config.geology ?? DEFAULT_GEOLOGY_CONFIG;
    validateGeologyConfig(config);
    if (signal.aborted) {
      throw new GenerationCancelledError();
    }

    const { sampleWidth, sampleHeight } = context.config.world.dimensions;
    const heatZoneMap = context.state.heatZoneMap;
    if (!heatZoneMap || heatZoneMap.length !== sampleWidth * sampleHeight) {
      throw new Error('A valid heat-zone map must be generated before geology.');
    }
    const baseClimate = context.config.baseClimate ?? DEFAULT_BASE_CLIMATE_CONFIG;
    const space = spaceOf(context);
    const thermalAt = createThermalAt(
      heatZoneMap,
      baseClimate.zones.map(zone => zone.thermal),
      space
    );

    report(PLAN_PROGRESS);
    const geologyPlan = buildGeologyPlan(
      config,
      context.random,
      context.config.world.shape,
      context.config.world.dimensions,
      space,
      {
        thermalAt,
        geologyCoupling: baseClimate.geologyCoupling,
        signal,
        report: progress => report(PLAN_PROGRESS + progress * (1 - PLAN_PROGRESS)),
      }
    );
    report(1);
    return { geologyPlan };
  }

  validate(state: Readonly<MapState>, _config: Readonly<MapConfig>): void {
    if (!state.geologyPlan || !isGeologyPlan(state.geologyPlan)) {
      throw new Error('Pipeline completed without all required map data.');
    }
  }

  summarize(
    _context: MapContext<MapConfig, MapState, string>,
    data: { geologyPlan: GeologyPlan }
  ): StageMetrics {
    const regions = data.geologyPlan.regions;
    const counts: Record<GeologicalRegionType, number> = {
      ordinary: 0,
      volcanic: 0,
      lagoon: 0,
      fjord: 0,
    };
    for (const region of regions) {
      counts[region.type]++;
    }
    return { regions: regions.length, ...counts };
  }
}
