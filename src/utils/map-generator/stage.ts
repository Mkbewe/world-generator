import type { MapContext } from './context';
import type { SeededWorldConfig, StageData, StageProgressReporter } from './types';

export interface MapStage<TConfig extends SeededWorldConfig, TState extends object> {
  readonly id: string;
  readonly name: string;
  /** Progress granularity, e.g. 0.5 for half steps. Defaults to 0.01. */
  readonly progressStep?: number;

  execute(
    context: MapContext<TConfig, TState>,
    signal: AbortSignal,
    report: StageProgressReporter
  ): Promise<StageData>;
}
