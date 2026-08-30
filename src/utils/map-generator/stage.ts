import type { MapContext } from './context';
import type { SeededWorldConfig } from './types';

export interface MapStage<TConfig extends SeededWorldConfig, TState extends object> {
  readonly id: string;
  readonly name: string;

  execute(context: MapContext<TConfig, TState>, signal: AbortSignal): Promise<void>;
}
