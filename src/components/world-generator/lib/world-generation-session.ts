import { type GenerationStatistics, usePreviewStore } from '../../../stores';
import {
  DEFAULT_MACRO_DEFORMATION,
  DEFAULT_MACRO_REGIONS,
  type MapConfig,
  type RunGeneration,
  runGeneration as runGenerationInWorker,
  selectDirtyStageIds,
  selectMapInfo,
} from '../../../utils/map-generator';
import { type LayerDataRecord, type MapRasters, selectRasters } from '../../../utils/map-layers';
import {
  type GeneratedMapSnapshot,
  layerRegistry,
  mapPersistence,
  type MapRenderer,
  mapRepository,
} from '../../../utils/map-renderer';
import { type GenerationProgressState, ProgressTracker } from '../../generation-progress';

/** Run metadata kept while the run is active, so a late renderer can catch up. */
type RunSnapshot = Omit<GeneratedMapSnapshot, 'layers'>;

/**
 * Owns one generation run for the whole app. The preview only attaches its
 * renderer, so leaving the generator page keeps the run alive and the data is
 * replayed to the next renderer.
 */
export class WorldGenerationSession {
  private generation?: AbortController;
  private renderer?: MapRenderer;
  private layers: MapRasters = {};
  private run?: RunSnapshot;
  private previousConfig?: MapConfig;
  private dirtyStages: readonly string[] = [];

  constructor(private readonly runGeneration: RunGeneration = runGenerationInWorker) {}

  /** Stage ids the current run recomputes; the rest is reused from the saved map. */
  get dirtyStageIds(): readonly string[] {
    return this.dirtyStages;
  }

  /** Starts sending run data to a renderer, replaying what already arrived. */
  attach(renderer: MapRenderer): void {
    this.renderer = renderer;
    const run = this.run;
    if (!run) {
      mapPersistence.restore(renderer);
      return;
    }
    this.startRenderer(renderer, run);
    this.replay(renderer);
  }

  /** Stops sending data to the preview; the run itself keeps going. */
  detach(): void {
    this.renderer = undefined;
  }

  /** Stops generation; already queued rendering can finish. */
  cancel(): void {
    this.generation?.abort();
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
    this.layers = {};
    this.dirtyStages = selectDirtyStageIds(this.previousConfig, config);
    let progress: ProgressTracker | undefined;

    try {
      const info = selectMapInfo(config);
      const regionGeometry = {
        seed: config.world.seed,
        regions: config.macroRegions ?? DEFAULT_MACRO_REGIONS,
        deformation: config.macroRegionDeformation ?? DEFAULT_MACRO_DEFORMATION,
      };
      const run: RunSnapshot = {
        width: config.world.dimensions.sampleWidth,
        height: config.world.dimensions.sampleHeight,
        seed: String(config.world.seed),
        shape: config.world.shape,
        regionGeometry,
        info,
      };
      this.run = run;
      const renderer = this.renderer;
      if (renderer) {
        this.startRenderer(renderer, run);
      }
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
            this.receiveStage(event.data);
          }
          progress?.handle(event);
        },
      });

      signal.throwIfAborted();
      mapPersistence.save({ ...run, layers: this.layers });
      this.previousConfig = config;
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
        this.run = undefined;
      }
    }
  }

  /** Collects catalog rasters and sends them to the attached preview when there is one. */
  private receiveStage(data: LayerDataRecord): void {
    const rasters = selectRasters(data);
    Object.assign(this.layers, rasters);
    const displayed = layerRegistry.presentIn(rasters).at(-1);
    if (displayed) {
      // The preview tab follows the generated layers, also while the page is unmounted.
      usePreviewStore.getState().setBaseLayer(displayed);
    }
    const renderer = this.renderer;
    if (!renderer || renderer.signal.aborted) {
      return;
    }
    this.send(renderer, rasters);
  }

  private startRenderer(renderer: MapRenderer, run: RunSnapshot): void {
    renderer.start({ width: run.width, height: run.height }, run.shape, run.regionGeometry);
    renderer.setInfo(run.info ?? {});
  }

  /** Replays collected layers without walking the preview through each of them. */
  private replay(renderer: MapRenderer): void {
    const values: LayerDataRecord = this.layers;
    const ids = layerRegistry.presentIn(values);
    for (const [index, id] of ids.entries()) {
      const silent = index < ids.length - 1;
      renderer.add(id, values[layerRegistry.get(id).source], silent);
    }
  }

  private send(renderer: MapRenderer, values: LayerDataRecord): void {
    for (const id of layerRegistry.presentIn(values)) {
      renderer.add(id, values[layerRegistry.get(id).source]);
    }
  }
}

/** Shared run, so leaving the generator page does not cancel it. */
export const worldGenerationSession = new WorldGenerationSession();
