import type { GenerationEvent, MapConfig, MapState, StageStatistics } from '../types';

export interface PipelineWorkerGenerateRequest {
  type: 'generate';
  requestId: number;
  config: MapConfig;
}

export type PipelineWorkerRequest = PipelineWorkerGenerateRequest;

export type PipelineWorkerStageEvent = GenerationEvent & { requestId: number };

export interface PipelineWorkerGenerationResult {
  layers: Required<MapState>;
  statistics: readonly StageStatistics[];
  totalDurationMs: number;
}

export interface PipelineWorkerResultResponse {
  type: 'result';
  requestId: number;
  result: PipelineWorkerGenerationResult;
}

export interface PipelineWorkerErrorResponse {
  type: 'error';
  requestId: number;
  message: string;
}

export type PipelineWorkerResponse =
  PipelineWorkerStageEvent | PipelineWorkerResultResponse | PipelineWorkerErrorResponse;
