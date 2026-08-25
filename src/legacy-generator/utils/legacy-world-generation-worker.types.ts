import type { IslandCounts } from './world-generation';
import type { Params } from '../types';

export interface LegacyWorldGenerationWorkerRequest {
  type: 'generate';
  requestId: number;
  width: number;
  height: number;
  params: Params;
}

export interface LegacyWorldGenerationWorkerResult {
  type: 'result';
  requestId: number;
  pixels: Uint8ClampedArray;
  seed: string;
  islandCounts: IslandCounts;
  computeDurationMs: number;
}

export interface LegacyWorldGenerationWorkerError {
  type: 'error';
  requestId: number;
  message: string;
}

export type LegacyWorldGenerationWorkerResponse =
  LegacyWorldGenerationWorkerResult | LegacyWorldGenerationWorkerError;
