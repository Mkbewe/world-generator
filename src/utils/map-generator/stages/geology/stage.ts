import { isGeologyPlan, validateGeologyConfig } from './geology-check';
import { buildGeologyPlan } from './plan';
import { DEFAULT_GEOLOGY_CONFIG } from './presets';
import { GenerationCancelledError } from '../../errors';
import type { MapContext } from '../../pipeline/context';
import { type MapStage } from '../../pipeline/stage';
import { GEOLOGY_STAGE } from '../../pipeline/stage-definitions';
import type {
  GeologyPlan,
  MapConfig,
  MapState,
  StageMetrics,
  StageProgressReporter,
} from '../../types';

/** Progress reported before the plan itself is built. */
const PLAN_PROGRESS = 0.1;

/**
 * Plans the geological areas: resolves their placement and samples a terrain
 * profile per area. The stage never walks world cells and holds no raster; the
 * heightfield and the actual islands belong to later stages.
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
  readonly reads: readonly (keyof MapState)[] = [];
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

    report(PLAN_PROGRESS);
    const geologyPlan = buildGeologyPlan(
      config,
      context.random,
      context.config.world.shape,
      context.config.world.dimensions,
      signal
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
  ): StageMetrics | undefined {
    const areas = data.geologyPlan.areas;
    return {
      areas: areas.length,
      meanExtent: areas.reduce((total, area) => total + area.extent, 0) / Math.max(1, areas.length),
    };
  }
}
