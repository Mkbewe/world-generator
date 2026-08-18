import { GenerationCancelledError, GenerationStageError } from './world-generation.errors';
import type {
  GenerationOptions,
  GenerationResult,
  StageStatistics,
} from './world-generation.types';
import type { SeededWorldConfig } from './world-generation-config';
import { WorldGenerationContext } from './world-generation-context';
import type { WorldGenerationStage } from './world-generation-stage';

export class WorldGenerationPipeline<TConfig extends SeededWorldConfig, TState extends object> {
  constructor(readonly stages: readonly WorldGenerationStage<TConfig, TState>[]) {}

  async generate(
    config: Readonly<TConfig>,
    initialState: TState,
    options: GenerationOptions = {}
  ): Promise<GenerationResult<WorldGenerationContext<TConfig, TState>>> {
    const context = new WorldGenerationContext(config, initialState);
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
    }

    return {
      context,
      statistics: context.statistics,
      totalDurationMs: performance.now() - generationStartedAt,
    };
  }

  private throwIfCancelled(signal: AbortSignal): void {
    if (signal.aborted) {
      throw new GenerationCancelledError();
    }
  }

  private createStatistics(
    stage: WorldGenerationStage<TConfig, TState>,
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
