import type { MapRasters } from '../../map-layers';
import type { StageInfo } from '../stage-definitions';
import type { GenerationEvent, MapConfig, StageStatistics } from '../types';

/** Stage outputs reused from the saved map instead of being generated again. */
export interface PipelineWorkerReuse {
  /** Stage ids that must run; every other stage is skipped. */
  dirtyStageIds: readonly string[];
  cachedRasters: MapRasters;
}

export interface PipelineWorkerGenerateRequest {
  type: 'generate';
  config: MapConfig;
  reuse: PipelineWorkerReuse;
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
