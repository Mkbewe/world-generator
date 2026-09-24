import {
  type MapConfig,
  type MapState,
  type PipelineStageId,
  type PipelineWorkerReuse,
  selectDirtyStageIds,
  type StageInfo,
  type StageStatistics,
} from '../../../utils/map-generator';

/**
 * Selective regeneration state kept between runs: the configuration and the real
 * per-stage costs of the saved map, the last announced stage list and the dirty
 * set of the current run.
 */
export class SelectiveRegeneration {
  private config?: MapConfig;
  private stages: readonly StageInfo[] = [];
  private readonly statistics = new Map<string, StageStatistics>();
  private dirty: readonly PipelineStageId[] = [];

  /** Stages the last worker announced; empty before the first run. */
  get announcedStages(): readonly StageInfo[] {
    return this.stages;
  }

  /** Stages of the announced list that this run reuses instead of running. */
  get reusedStageIds(): readonly PipelineStageId[] {
    const dirty = new Set(this.dirty);
    return this.stages.filter(stage => !dirty.has(stage.id)).map(stage => stage.id);
  }

  /** Plans a run against the saved map and returns what the worker may reuse. */
  plan(config: MapConfig, cachedState: MapState): PipelineWorkerReuse {
    this.dirty = selectDirtyStageIds(this.config, config);
    return { dirtyStageIds: this.dirty, cachedState };
  }

  /** Remembers the stage list the worker announced. */
  announce(stages: readonly StageInfo[]): void {
    this.stages = stages;
  }

  /**
   * A reused stage keeps the cost and metrics of the run that actually produced
   * its data; only the status marks that this run skipped it.
   */
  mergeStatistics(statistics: readonly StageStatistics[]): readonly StageStatistics[] {
    const merged: StageStatistics[] = [];
    for (const stage of statistics) {
      if (stage.status !== 'skipped') {
        this.statistics.set(stage.stageId, stage);
        merged.push(stage);
        continue;
      }
      const real = this.statistics.get(stage.stageId);
      merged.push(real ? { ...real, status: 'skipped' } : stage);
    }
    return merged;
  }

  /** Remembers the run that produced the saved map. */
  remember(config: MapConfig): void {
    this.config = config;
  }

  /** Forgets the saved map and everything derived from it. */
  reset(): void {
    this.config = undefined;
    this.stages = [];
    this.statistics.clear();
    this.dirty = [];
  }
}
