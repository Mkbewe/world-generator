import { SelectiveRegeneration } from './regeneration';
import { type GenerationStatistics, usePreviewStore } from '../../../stores';
import {
  DEFAULT_MACRO_DEFORMATION,
  DEFAULT_MACRO_REGIONS,
  type MapConfig,
  type MapState,
  type RunGeneration,
  runGeneration as runGenerationInWorker,
  selectDomainOutputs,
  selectMapInfo,
} from '../../../utils/map-generator';
import {
  hasCurrentRasterSources,
  type LayerDataRecord,
  type MapRasters,
  selectRasters,
} from '../../../utils/map-layers';
import {
  type GeneratedMapSnapshot,
  layerRegistry,
  mapPersistence,
  type MapRenderer,
  mapRepository,
} from '../../../utils/map-renderer';
import {
  type GenerationProgressState,
  planProgress,
  ProgressTracker,
} from '../../generation-progress';

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
  /** Whether the preview follows the stages of the current run. */
  private followRun = false;
  /** Selective regeneration state: the saved map baseline and the current plan. */
  private readonly regeneration = new SelectiveRegeneration();

  constructor(private readonly runGeneration: RunGeneration = runGenerationInWorker) {}

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

  /** Forgets the saved map, its layers and its baseline. */
  reset(): void {
    this.cancel();
    this.layers = {};
    this.run = undefined;
    this.followRun = false;
    this.regeneration.reset();
    mapRepository.clear();
  }

  /** Returns no result when generation is cancelled or replaced by another run. */
  async generate(
    config: MapConfig,
    onProgress: (progress: GenerationProgressState) => void
  ): Promise<GenerationStatistics | undefined> {
    this.cancel();
    const saved = mapRepository.get();
    if (saved && !hasCurrentRasterSources(saved.layers)) {
      // A snapshot in a format this build no longer understands (e.g. the old
      // landmass id map) is dropped with its regeneration baseline instead of
      // being migrated or re-saved; the run starts from scratch.
      this.reset();
    }
    const generation = new AbortController();
    this.generation = generation;
    const signal = generation.signal;
    const cached = mapRepository.get();
    const cachedState: MapState = {
      ...(cached?.layers ?? {}),
      ...selectDomainOutputs(cached?.info ?? {}),
    };
    const plan = this.regeneration.plan(config, cachedState);
    this.layers = { ...(cached?.layers ?? {}) };
    // The saved map stays until this run succeeds, so a failure keeps it.
    // Reused stages are marked as skipped before the worker reports anything.
    const announced = this.regeneration.announcedStages;
    if (announced.length > 0) {
      onProgress(planProgress(announced, this.regeneration.reusedStageIds));
    }
    let progress: ProgressTracker | undefined;

    try {
      const info = {
        ...selectMapInfo(config),
        ...selectDomainOutputs(cached?.info ?? {}),
      };
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
        dimensionsMeters: {
          widthMeters: config.world.dimensions.widthMeters,
          heightMeters: config.world.dimensions.heightMeters,
        },
        info,
      };
      this.run = run;
      const renderer = this.renderer;
      if (renderer) {
        this.startRenderer(renderer, run);
      }
      // A fresh preview follows the stages; an existing one keeps its selection.
      // This mirrors `MapView.start`, which keeps the displayed layer while the
      // map size is unchanged, so the canvas and the layer tabs stay in sync.
      this.followRun = !renderer?.state.displayedLayer;
      signal.throwIfAborted();
      const result = await this.runGeneration(config, {
        signal,
        reuse: plan,
        onStages: stages => {
          this.regeneration.announce(stages);
          progress = new ProgressTracker(stages, onProgress, this.regeneration.reusedStageIds);
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
      this.regeneration.remember(config);
      progress?.complete(result.totalDurationMs);
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
        this.run = undefined;
      }
    }
  }

  /** Collects catalog rasters and sends them to the attached preview when there is one. */
  private receiveStage(data: LayerDataRecord): void {
    const domain = selectDomainOutputs(data);
    if (Object.keys(domain).length > 0) {
      this.mergeInfo(domain);
    }
    const rasters = selectRasters(data);
    Object.assign(this.layers, rasters);
    if (this.followRun) {
      const displayed = layerRegistry.presentIn(rasters).at(-1);
      if (displayed) {
        // The preview tab follows the first map while it is being built.
        usePreviewStore.getState().setBaseLayer(displayed);
      }
    }
    const renderer = this.renderer;
    if (!renderer || renderer.signal.aborted) {
      return;
    }
    this.send(renderer, rasters);
  }

  /** Merges stage domain outputs into the run so a reused stage does not drop them. */
  private mergeInfo(domain: MapState): void {
    const run = this.run;
    if (!run) {
      return;
    }
    run.info = {
      ...run.info,
      ...domain,
    };
    this.renderer?.setInfo(run.info);
  }

  private startRenderer(renderer: MapRenderer, run: RunSnapshot): void {
    renderer.start(
      { width: run.width, height: run.height },
      run.shape,
      run.regionGeometry,
      run.dimensionsMeters
    );
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
