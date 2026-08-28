import type { StageStatistics } from '../types';

export class GenerationStageError extends Error {
  constructor(
    readonly stageId: string,
    readonly stageName: string,
    readonly stageStatistics: StageStatistics,
    readonly generationStatistics: readonly StageStatistics[],
    options?: ErrorOptions
  ) {
    super(`World generation failed during stage "${stageName}" (${stageId}).`, options);
    this.name = 'GenerationStageError';
  }
}
