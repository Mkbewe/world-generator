import type { StageInfo } from '../stage-definitions';
import type { GenerationEvent, MapConfig, StageStatistics } from '../types';

export interface PipelineWorkerGenerateRequest {
  type: 'generate';
  config: MapConfig;
}

export type PipelineWorkerRequest = PipelineWorkerGenerateRequest;

export interface PipelineWorkerStagesResponse {
  type: 'stages';
  stages: readonly StageInfo[];
}

export interface PipelineWorkerGenerationResult {
  statistics: readonly StageStatistics[];
  totalDurationMs: number;
}

export interface PipelineWorkerResultResponse {
  type: 'result';
  result: PipelineWorkerGenerationResult;
}

export interface PipelineWorkerErrorResponse {
  type: 'error';
  message: string;
}

export type PipelineWorkerResponse =
  | GenerationEvent
  | PipelineWorkerStagesResponse
  | PipelineWorkerResultResponse
  | PipelineWorkerErrorResponse;
