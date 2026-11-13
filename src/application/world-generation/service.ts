import {
  DEFAULT_MACRO_DEFORMATION,
  DEFAULT_MACRO_REGIONS,
  type MapConfig,
  type MapState,
  type PipelineWorkerGenerationResult,
  type RunGeneration,
  selectDomainOutputs,
  selectMapInfo,
  selectPersistentRasters,
} from '@generator';
import { hasCurrentRasterOutputs, type MapInfo, type MapRasters } from '@layers';

import { SelectiveRegeneration } from './regeneration';
import type {
  WorldGenerationCache,
  WorldGenerationPorts,
  WorldGenerationRun,
  WorldGenerationSnapshot,
} from './types';

export class WorldGenerationService {
  private generation?: AbortController;
  private readonly regeneration = new SelectiveRegeneration();

  constructor(
    private readonly runGeneration: RunGeneration,
    private readonly cache: WorldGenerationCache
  ) {}

  cancel(): void {
    this.generation?.abort();
  }

  reset(): void {
    this.cancel();
    this.cache.clear();
    this.regeneration.reset();
  }

  async generate(
    config: MapConfig,
    ports: WorldGenerationPorts = {}
  ): Promise<PipelineWorkerGenerationResult | undefined> {
    this.cancel();
    const saved = this.cache.get();
    if (saved && !hasCurrentRasterOutputs(saved.layers)) {
      this.cache.clear();
      this.regeneration.reset();
    }

    const generation = new AbortController();
    this.generation = generation;
    const signal = generation.signal;

    try {
      const cached = this.cache.get();
      const cachedState: MapState = {
        ...(cached?.layers ?? {}),
        ...selectDomainOutputs(cached?.info ?? {}),
      };
      const plan = this.regeneration.plan(config, cachedState);
      const layers: MapRasters = { ...(cached?.layers ?? {}) };
      const announced = this.regeneration.announcedStages;
      if (announced.length > 0) {
        ports.onPlannedStages?.(announced, this.regeneration.reusedStageIds);
      }

      let info: MapInfo = {
        ...selectMapInfo(config),
        ...selectDomainOutputs(cached?.info ?? {}),
      };
      const regionGeometry = {
        seed: config.world.seed,
        regions: config.macroRegions ?? DEFAULT_MACRO_REGIONS,
        deformation: config.macroRegionDeformation ?? DEFAULT_MACRO_DEFORMATION,
      };
      const run: WorldGenerationRun = {
        width: config.world.dimensions.sampleWidth,
        height: config.world.dimensions.sampleHeight,
        seed: String(config.world.seed),
        shape: config.world.shape,
        regionGeometry,
        dimensionsMeters: {
          widthMeters: config.world.dimensions.widthMeters,
          heightMeters: config.world.dimensions.heightMeters,
        },
        info,
      };
      ports.onStart?.(run, { ...layers });
      signal.throwIfAborted();

      const result = await this.runGeneration(config, {
        signal,
        reuse: plan,
        onStages: (stages, skippedStageIds) => {
          this.regeneration.announce(stages);
          ports.onStages?.(stages, skippedStageIds);
        },
        onEvent: event => {
          signal.throwIfAborted();
          if (event.type === 'stage-completed') {
            const domain = selectDomainOutputs(event.data);
            if (Object.keys(domain).length > 0) {
              info = { ...info, ...domain };
            }
            const rasters = selectPersistentRasters(event.data);
            Object.assign(layers, rasters);
            ports.onStage?.({
              layers,
              rasters,
              ...(Object.keys(domain).length > 0 ? { info } : {}),
            });
          }
          ports.onEvent?.(event);
        },
      });

      signal.throwIfAborted();
      const snapshot: WorldGenerationSnapshot = { ...run, info, layers };
      this.cache.save(snapshot);
      this.regeneration.remember(config);
      return {
        statistics: this.regeneration.mergeStatistics(result.statistics),
        totalDurationMs: result.totalDurationMs,
      };
    } catch (error) {
      if (signal.aborted) {
        return undefined;
      }
      throw error;
    } finally {
      if (this.generation === generation) {
        this.generation = undefined;
      }
    }
  }
}
