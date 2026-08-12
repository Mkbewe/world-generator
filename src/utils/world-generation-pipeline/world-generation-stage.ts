import type { SeededWorldConfig } from './world-generation-config';
import type { WorldGenerationContext } from './world-generation-context';

export interface WorldGenerationStage<TConfig extends SeededWorldConfig, TState extends object> {
  readonly id: string;
  readonly name: string;

  execute(context: WorldGenerationContext<TConfig, TState>, signal: AbortSignal): Promise<void>;
}
