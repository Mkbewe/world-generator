import { MapContext } from './context';
import { GenerationCancelledError, GenerationStageError } from './errors';
import type { MapStage } from './stage';
import type {
  GenerationOptions,
  GenerationResult,
  MapGeneratorOptions,
  SeededWorldConfig,
  StageStatistics,
} from './types';

export class MapGenerator<TConfig extends SeededWorldConfig, TState extends object> {
  constructor(
    readonly stages: readonly MapStage<TConfig, TState>[],
    private readonly options: MapGeneratorOptions = {}
  ) {}

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

      try {
        await stage.execute(context, signal);
        this.throwIfCancelled(signal);
      } catch (error) {
        if (error instanceof GenerationCancelledError || signal.aborted) {
          throw new GenerationCancelledError();
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

      const statistics = this.createStatistics(stage, startedAt, 'completed');

      context.statistics.push(statistics);
      options.onEvent?.({
        type: 'stage-completed',
        stageId: stage.id,
        stageName: stage.name,
        stageIndex,
        stageCount: this.stages.length,
        statistics,
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
    status: StageStatistics['status']
  ): StageStatistics {
    const finishedAt = performance.now();

    return {
      stageId: stage.id,
      stageName: stage.name,
      status,
      startedAt,
      finishedAt,
      durationMs: finishedAt - startedAt,
    };
  }
}
