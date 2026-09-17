import type { GenerationStatistics } from '../../../stores';
import {
  type MapConfig,
  type RunGeneration,
  runGeneration as runGenerationInWorker,
  selectMapInfo,
} from '../../../utils/map-generator';
import { type LayerDataRecord, type MapRasters, selectRasters } from '../../../utils/map-layers';
import { mapPersistence, type MapRenderer, mapRepository } from '../../../utils/map-renderer';
import { sampleSize } from '../../../utils/world-dimensions';
import { type GenerationProgressState, ProgressTracker } from '../../generation-progress';

/** Coordinates generation and preview, with independent cancellation for each. */
export class WorldGenerationSession {
  private generation?: AbortController;

  constructor(
    private readonly renderer: MapRenderer,
    private readonly runGeneration: RunGeneration = runGenerationInWorker
  ) {}

  /** Stops generation; already queued rendering can finish. */
  cancel(): void {
    this.generation?.abort();
  }

  restore(): void {
    mapPersistence.restore(this.renderer);
  }

  /** Returns no result when generation is cancelled or replaced by another run. */
  async generate(
    config: MapConfig,
    onProgress: (progress: GenerationProgressState) => void
  ): Promise<GenerationStatistics | undefined> {
    this.cancel();
    const generation = new AbortController();
    this.generation = generation;
    const signal = generation.signal;
    const layers: MapRasters = {};
    let progress: ProgressTracker | undefined;

    try {
      const info = selectMapInfo(config);
      this.renderer.start(sampleSize(config.world.dimensions));
      this.renderer.setInfo(info);
      const renderSignal = this.renderer.signal;
      mapRepository.clear();
      signal.throwIfAborted();
      const result = await this.runGeneration(config, {
        signal,
        onStages: stages => {
          progress = new ProgressTracker(stages, onProgress);
          progress.start();
        },
        onEvent: event => {
          signal.throwIfAborted();
          if (event.type === 'stage-completed') {
            this.receiveStage(event.data, layers, !renderSignal.aborted);
          }
          progress?.handle(event);
        },
      });

      signal.throwIfAborted();
      mapPersistence.save({
        width: config.world.dimensions.sampleWidth,
        height: config.world.dimensions.sampleHeight,
        seed: String(config.world.seed),
        shape: config.world.shape ?? 'disc',
        layers,
        info,
      });
      progress?.complete(result.totalDurationMs);
      return {
        statistics: result.statistics,
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

  /** Collects catalog rasters and optionally sends them to the active preview. */
  private receiveStage(data: LayerDataRecord, target: MapRasters, render: boolean): void {
    const { registry } = this.renderer;
    const rasters = selectRasters(data);
    const values: LayerDataRecord = rasters;
    Object.assign(target, rasters);
    for (const id of registry.presentIn(values)) {
      const source = registry.get(id).source;
      const value = values[source];
      if (render) {
        this.renderer.add(id, value);
      }
    }
  }
}
