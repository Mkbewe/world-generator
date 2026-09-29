import type { StageFailure } from './stage-failure';
import type { StageStatistics } from '../types';

export class GenerationStageError<TId extends string = string> extends Error {
  /** Entry-level failures of the stage, e.g. the areas it could not place. */
  readonly failures: readonly StageFailure[];

  constructor(
    readonly stageId: TId,
    readonly stageName: string,
    readonly stageStatistics: StageStatistics<TId>,
    readonly generationStatistics: readonly StageStatistics<TId>[],
    options?: ErrorOptions & { readonly failures?: readonly StageFailure[] }
  ) {
    super(`Map generation failed during stage "${stageName}" (${stageId}).`, options);
    this.name = 'GenerationStageError';
    this.failures = options?.failures ?? [];
  }
}
