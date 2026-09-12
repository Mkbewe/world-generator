import type { MapContext } from './context';
import type { SeededWorldConfig, StageData, StageMetrics, StageProgressReporter } from './types';

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

  /** Verifies that this stage left its required output in the shared state. */
  validate?(state: Readonly<TState>, config: Readonly<TConfig>): void;

  /** Optional metrics derived from the produced data and exposed in the statistics. */
  summarize?(context: MapContext<TConfig, TState>, data: StageData): StageMetrics | undefined;
}

/** Throws when a stage output is missing or has the wrong type and size. */
export function assertStageOutput(value: unknown, kind: 'uint8' | 'float32', cells: number): void {
  const valid =
    kind === 'uint8'
      ? value instanceof Uint8Array && value.length === cells
      : value instanceof Float32Array && value.length === cells;

  if (!valid) {
    throw new Error('Pipeline completed without all required map data.');
  }
}
