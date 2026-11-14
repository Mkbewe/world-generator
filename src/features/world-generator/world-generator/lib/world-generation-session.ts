import {
  type MapConfig,
  type PipelineWorkerGenerationResult,
  type RunGeneration,
  runGeneration as runGenerationInWorker,
} from '@generator';
import { type MapRenderer, mapRepository } from '@renderer';

import { WorldGenerationPreview } from './world-generation-preview';
import {
  type WorldGenerationCache,
  WorldGenerationService,
} from '../../../../application/world-generation';
import type { GenerationProgressState } from '../../../../stores';
import { planProgress, ProgressTracker } from '../../generation-progress';

const mapCache: WorldGenerationCache = {
  get: () => mapRepository.get(),
  save: snapshot => mapRepository.save(snapshot),
  clear: () => mapRepository.clear(),
};

/** Wires the generation use case to the shared preview and progress presentation. */
export class WorldGenerationSession {
  private readonly service: WorldGenerationService;
  private readonly preview = new WorldGenerationPreview();
  private nextRunId = 0;

  constructor(
    runGeneration: RunGeneration = runGenerationInWorker,
    cache: WorldGenerationCache = mapCache
  ) {
    this.service = new WorldGenerationService(runGeneration, cache);
  }

  attach(renderer: MapRenderer): void {
    this.preview.attach(renderer);
  }

  detach(): void {
    this.preview.detach();
  }

  cancel(): void {
    this.service.cancel();
  }

  reset(): void {
    this.service.reset();
    this.preview.reset();
  }

  async generate(
    config: MapConfig,
    onProgress: (progress: GenerationProgressState) => void
  ): Promise<PipelineWorkerGenerationResult | undefined> {
    const runId = ++this.nextRunId;
    let tracker: ProgressTracker | undefined;

    try {
      const result = await this.service.generate(config, {
        onPlannedStages: (stages, skippedStageIds) => {
          onProgress(planProgress(stages, skippedStageIds));
        },
        onStages: (stages, skippedStageIds) => {
          tracker = new ProgressTracker(stages, onProgress, skippedStageIds);
          tracker.start();
        },
        onStart: (run, layers) => {
          this.preview.begin(runId, run, layers);
        },
        onStage: update => {
          this.preview.receive(runId, update);
        },
        onEvent: event => {
          tracker?.handle(event);
        },
      });

      if (result) {
        tracker?.complete(result.totalDurationMs);
      }
      return result;
    } finally {
      this.preview.finish(runId);
    }
  }
}

/** Shared run, so leaving the generator page does not cancel it. */
export const worldGenerationSession = new WorldGenerationSession();
