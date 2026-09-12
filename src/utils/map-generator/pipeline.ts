import { MapContext } from './context';
import { GenerationCancelledError, GenerationStageError } from './errors';
import type { MapStage } from './stage';
import type {
  GenerationEvent,
  GenerationOptions,
  GenerationResult,
  MapGeneratorOptions,
  SeededWorldConfig,
  StageMetrics,
  StageProgressReporter,
  StageStatistics,
} from './types';

export class MapGenerator<TConfig extends SeededWorldConfig, TState extends object> {
  constructor(
    readonly stages: readonly MapStage<TConfig, TState>[],
    private readonly options: MapGeneratorOptions = {}
  ) {
    const ids = new Set<string>();
    for (const stage of stages) {
      if (ids.has(stage.id)) {
        throw new Error(`Duplicate stage id: "${stage.id}".`);
      }
      ids.add(stage.id);
    }
  }

  async generate(
    config: Readonly<TConfig>,
    initialState: TState,
    options: GenerationOptions = {}
  ): Promise<GenerationResult<MapContext<TConfig, TState>>> {
    const context = new MapContext(config, initialState);
    const signal = options.signal ?? new AbortController().signal;
    const generationStartedAt = performance.now();

    for (const [stageIndex, stage] of this.stages.entries()) {
      this.throwIfCancelled(signal);

      options.onEvent?.({
        type: 'stage-started',
        stageId: stage.id,
        stageName: stage.name,
        stageIndex,
        stageCount: this.stages.length,
      });
      await this.delay(this.options.stageDelayMs);

      const startedAt = performance.now();

      const report = createProgressReporter(
        {
          stageId: stage.id,
          stageName: stage.name,
          stageIndex,
          stageCount: this.stages.length,
        },
        stage.progressStep ?? 0.01,
        options.onEvent
      );

      let data;
      try {
        data = await stage.execute(context, signal, report);
        this.throwIfCancelled(signal);
        stage.validate?.(context.state, context.config);
      } catch (error) {
        if (error instanceof GenerationCancelledError) {
          throw error;
        }

        const statistics = this.createStatistics(stage, startedAt, 'failed');
        context.statistics.push(statistics);
        options.onEvent?.({
          type: 'stage-failed',
          stageId: stage.id,
          stageName: stage.name,
          stageIndex,
          stageCount: this.stages.length,
          statistics,
        });

        throw new GenerationStageError(stage.id, stage.name, statistics, [...context.statistics], {
          cause: error,
        });
      }

      const statistics = this.createStatistics(
        stage,
        startedAt,
        'completed',
        stage.summarize?.(context, data)
      );

      context.statistics.push(statistics);
      options.onEvent?.({
        type: 'stage-completed',
        stageId: stage.id,
        stageName: stage.name,
        stageIndex,
        stageCount: this.stages.length,
        statistics,
        // The snapshot keeps consumers from replacing keys of the shared state.
        data: Object.freeze({ ...data }),
      });
      await this.delay(this.options.stageDelayMs);
    }

    return {
      context,
      statistics: context.statistics,
      totalDurationMs: performance.now() - generationStartedAt,
    };
  }

  private async delay(durationMs = 0): Promise<void> {
    if (durationMs <= 0) {
      return;
    }

    await new Promise(resolve => globalThis.setTimeout(resolve, durationMs));
  }

  private throwIfCancelled(signal: AbortSignal): void {
    if (signal.aborted) {
      throw new GenerationCancelledError();
    }
  }

  private createStatistics(
    stage: MapStage<TConfig, TState>,
    startedAt: number,
    status: StageStatistics['status'],
    details?: StageMetrics
  ): StageStatistics {
    const finishedAt = performance.now();

    return {
      stageId: stage.id,
      stageName: stage.name,
      status,
      startedAt,
      finishedAt,
      durationMs: finishedAt - startedAt,
      ...(details ? { details } : {}),
    };
  }
}

function createProgressReporter(
  base: { stageId: string; stageName: string; stageIndex: number; stageCount: number },
  step: number,
  onEvent?: (event: GenerationEvent) => void
): StageProgressReporter {
  const size = step > 0 && step <= 1 ? step : 0.01;
  let lastBucket = -1;
  return progress => {
    const clamped = Math.min(1, Math.max(0, progress));
    const bucket = Math.floor(clamped / size);
    if (bucket === lastBucket) {
      return;
    }
    lastBucket = bucket;
    onEvent?.({ type: 'stage-progress', ...base, progress: Math.min(1, bucket * size) });
  };
}
