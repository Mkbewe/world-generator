import type { MapContext } from './context';
import type {
  ConditionalRead,
  SeededWorldConfig,
  StageData,
  StageMetrics,
  StageProgressReporter,
} from './types';

export interface MapStage<
  TConfig extends SeededWorldConfig,
  TState extends object,
  TId extends string = string,
  TOutput extends StageData = StageData,
> {
  readonly id: TId;
  readonly name: string;
  /** State keys this stage reads. Absent on generic test stages. */
  readonly reads?: readonly (keyof TState)[];
  /**
   * State keys this stage reads only while the config selects them.
   * The factory orders by the union with `reads`; the pipeline asserts the
   * resolved set for the run config.
   */
  readonly conditionalReads?: readonly ConditionalRead<TConfig, TState>[];
  /**
   * State keys this stage writes, bound to its output type: every declared
   * write must exist on the value `execute` returns. The pipeline copies
   * them from the result.
   */
  readonly writes?: readonly (keyof TState & keyof TOutput)[];
  /** Progress granularity, e.g. 0.5 for half steps. Defaults to 0.01. */
  readonly progressStep?: number;
  /**
   * Configuration slices the stage reads, declared in `stage-definitions.ts`.
   * Selective regeneration recomputes exactly the stages whose declared
   * slices changed; the keys already cover what a stage inherits through
   * the outputs of earlier stages.
   */
  readonly configKeys: readonly string[];

  execute(
    context: MapContext<TConfig, TState, TId>,
    signal: AbortSignal,
    report: StageProgressReporter
  ): Promise<TOutput>;

  /** Verifies that this stage left its required output in the shared state. */
  validate?(state: Readonly<TState>, config: Readonly<TConfig>): void;

  /** Optional metrics derived from the produced data and exposed in the statistics. */
  summarize?(context: MapContext<TConfig, TState, TId>, data: TOutput): StageMetrics | undefined;
}

/**
 * State keys a stage needs: without a config the union of `reads` and every
 * conditional edge (for ordering); with a config only the selected edges
 * (for input assertion).
 */
export function resolveReads<TConfig extends SeededWorldConfig, TState extends object>(
  stage: Pick<MapStage<TConfig, TState, string, StageData>, 'reads' | 'conditionalReads'>,
  config?: Readonly<TConfig>
): readonly (keyof TState)[] {
  const keys = [...(stage.reads ?? [])];
  for (const edge of stage.conditionalReads ?? []) {
    if ((!config || edge.when(config)) && !keys.includes(edge.key)) {
      keys.push(edge.key);
    }
  }
  return keys;
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
