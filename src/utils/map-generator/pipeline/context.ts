import { RandomFactory } from '../random/random-factory';
import type { WorldSpace } from '../space';
import type { SeededWorldConfig, StageStatistics } from '../types';

/**
 * Shared state passed through all generation stages.
 *
 * Configuration is immutable for a generation run and may contain nested,
 * stage-specific sections. State contains the data produced by stages.
 * `space` carries the canonical coordinate frame; the pipeline sets it from
 * the run configuration, direct `MapContext` users may pass it explicitly.
 */
export class MapContext<
  TConfig extends SeededWorldConfig,
  TState extends object,
  TId extends string = string,
> {
  readonly statistics: StageStatistics<TId>[] = [];
  readonly random: RandomFactory;

  constructor(
    readonly config: Readonly<TConfig>,
    readonly state: TState,
    readonly space?: WorldSpace
  ) {
    this.random = new RandomFactory(config.world.seed);
  }
}
