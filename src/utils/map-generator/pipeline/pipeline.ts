import { MapContext } from './context';
import { type MapStage, resolveReads } from './stage';
import { commitStageWrites } from './stage-outputs';
import { GenerationCancelledError, GenerationStageError } from '../errors';
import type { WorldSpace } from '../space';
import type {
  GenerationEvent,
  GenerationOptions,
  GenerationResult,
  MapGeneratorOptions,
  SeededWorldConfig,
  StageData,
  StageMetrics,
  StageProgressReporter,
  StageStatistics,
} from '../types';

export class MapGenerator<
  TConfig extends SeededWorldConfig,
  TState extends object,
  TId extends string = string,
> {
  constructor(
    readonly stages: readonly MapStage<TConfig, TState, TId, StageData>[],
    private readonly options: MapGeneratorOptions<TConfig> & {
      /** Derives the run's coordinate frame; absent on generic test pipelines. */
      createSpace?: (config: Readonly<TConfig>) => WorldSpace;
    } = {}
  ) {
    const ids = new Set<string>();
    const knownConfigKeys = this.options.knownConfigKeys
      ? new Set(this.options.knownConfigKeys)
      : undefined;

    for (const stage of stages) {
      if (ids.has(stage.id)) {
        throw new Error(`Duplicate stage id: "${stage.id}".`);
      }
      ids.add(stage.id);

      const seen = new Set<string>();
      for (const key of stage.configKeys) {
        if (seen.has(key)) {
          throw new Error(`Duplicate configuration key in stage "${stage.id}": "${key}".`);
        }
        if (knownConfigKeys && !knownConfigKeys.has(key)) {
          throw new Error(`Unknown configuration key in stage "${stage.id}": "${key}".`);
        }
        seen.add(key);
      }
    }
  }

  async generate(
    config: Readonly<TConfig>,
    initialState: TState,
    options: GenerationOptions<TId> = {}
  ): Promise<GenerationResult<MapContext<TConfig, TState, TId>, TId>> {
    this.options.validateConfig?.(config);
    const context = new MapContext<TConfig, TState, TId>(
      config,
      initialState,
      this.options.createSpace?.(config)
    );
    const signal = options.signal ?? new AbortController().signal;
    const skipStageIds = new Set<TId>(options.skipStageIds ?? []);
    const generationStartedAt = performance.now();

    for (const [stageIndex, stage] of this.stages.entries()) {
      this.throwIfCancelled(signal);

      if (skipStageIds.has(stage.id)) {
        const statistics = createSkippedStatistics(stage);
        context.statistics.push(statistics);
        options.onEvent?.({
          type: 'stage-skipped',
          stageId: stage.id,
          stageName: stage.name,
          stageIndex,
          stageCount: this.stages.length,
          statistics,
        });
        continue;
      }

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
        this.assertReads(stage, context.state, context.config);
        data = await stage.execute(context, signal, report);
        this.throwIfCancelled(signal);
        commitStageWrites(context.state, stage.id, stage.writes, data);
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

  private assertReads(
    stage: MapStage<TConfig, TState, TId, StageData>,
    state: TState,
    config: Readonly<TConfig>
  ): void {
    for (const key of resolveReads(stage, config)) {
      if (state[key] === undefined) {
        throw new Error(`Stage "${stage.id}" is missing input "${String(key)}".`);
      }
    }
  }

  private throwIfCancelled(signal: AbortSignal): void {
    if (signal.aborted) {
      throw new GenerationCancelledError();
    }
  }

  private createStatistics(
    stage: MapStage<TConfig, TState, TId, StageData>,
    startedAt: number,
    status: StageStatistics<TId>['status'],
    details?: StageMetrics
  ): StageStatistics<TId> {
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

function createSkippedStatistics<
  TConfig extends SeededWorldConfig,
  TState extends object,
  TId extends string,
>(stage: MapStage<TConfig, TState, TId, StageData>): StageStatistics<TId> {
  return {
    stageId: stage.id,
    stageName: stage.name,
    status: 'skipped',
    startedAt: 0,
    finishedAt: 0,
    durationMs: 0,
  };
}

function createProgressReporter<TId extends string>(
  base: { stageId: TId; stageName: string; stageIndex: number; stageCount: number },
  step: number,
  onEvent?: (event: GenerationEvent<TId>) => void
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
