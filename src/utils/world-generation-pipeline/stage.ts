import type { WorldGenerationContext } from './context';
import type { SeededWorldConfig } from './types';

export interface WorldGenerationStage<TConfig extends SeededWorldConfig, TState extends object> {
  readonly id: string;
  readonly name: string;

  execute(context: WorldGenerationContext<TConfig, TState>, signal: AbortSignal): Promise<void>;
}
