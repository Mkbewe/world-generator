import type { GenerationStatistics } from '../../stores';
import {
  type GenerationEvent,
  MAP_STAGES,
  type MapConfig,
  PipelineWorkerClient,
} from '../../utils/map-generator';
import {
  type MapLayers,
  mapPersistence,
  type MapRenderer,
  mapRepository,
} from '../../utils/map-renderer';
import { type GenerationProgressState, ProgressTracker } from '../generation-progress';

/** Coordinates generation and preview, with independent cancellation for each. */
export class WorldGenerationSession {
  private generation?: AbortController;

  constructor(private readonly renderer: MapRenderer) {}

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
    const worker = new PipelineWorkerClient();
    const abort = (): void => worker.dispose();
    signal.addEventListener('abort', abort, { once: true });
    const progress = new ProgressTracker(MAP_STAGES, onProgress);
    const layers: MapLayers = {};

    try {
      this.renderer.start(config.world);
      const renderSignal = this.renderer.signal;
      mapRepository.clear();
      progress.start();
      signal.throwIfAborted();
      const result = await worker.generate(config, {
        onEvent: event => {
          signal.throwIfAborted();
          if (event.type === 'stage-completed') {
            Object.assign(layers, event.data);
          }
          if (!renderSignal.aborted) {
            this.applyStage(event);
          }
          progress.handle(event);
        },
      });

      signal.throwIfAborted();
      mapPersistence.save({
        width: config.world.width,
        height: config.world.height,
        seed: String(config.world.seed),
        shape: config.world.shape ?? 'disc',
        layers,
      });
      progress.complete(result.totalDurationMs);
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
      signal.removeEventListener('abort', abort);
      worker.dispose();
      if (this.generation === generation) {
        this.generation = undefined;
      }
    }
  }

  private applyStage(event: GenerationEvent): void {
    const { registry } = this.renderer;
    if (event.type === 'stage-completed' && registry.has(event.stageId)) {
      this.renderer.add(event.stageId, event.data[registry.get(event.stageId).source]);
    }
  }
}
