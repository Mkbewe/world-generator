import type { StageStatistics } from '../types';

export class GenerationStageError<TId extends string = string> extends Error {
  constructor(
    readonly stageId: TId,
    readonly stageName: string,
    readonly stageStatistics: StageStatistics<TId>,
    readonly generationStatistics: readonly StageStatistics<TId>[],
    options?: ErrorOptions
  ) {
    super(`Map generation failed during stage "${stageName}" (${stageId}).`, options);
    this.name = 'GenerationStageError';
  }
}
