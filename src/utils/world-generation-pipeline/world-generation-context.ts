import { RandomFactory } from './random/random-factory';
import type { StageStatistics } from './world-generation.types';
import type { SeededWorldConfig } from './world-generation-config';

/**
 * Shared state passed through all generation stages.
 *
 * Configuration is immutable for a generation run and may contain nested,
 * stage-specific sections. State contains the data produced by stages.
 */
export class WorldGenerationContext<TConfig extends SeededWorldConfig, TState extends object> {
  readonly statistics: StageStatistics[] = [];
  readonly random: RandomFactory;

  constructor(
    readonly config: Readonly<TConfig>,
    readonly state: TState
  ) {
    this.random = new RandomFactory(config.world.seed);
  }
}
