import type { MapConfig, StageStatistics } from '../types';

export interface PipelineWorkerGenerateRequest {
  type: 'generate';
  requestId: number;
  config: MapConfig;
}

export type PipelineWorkerRequest = PipelineWorkerGenerateRequest;

interface PipelineWorkerStageEventBase {
  requestId: number;
  stageId: string;
  stageName: string;
  stageIndex: number;
  stageCount: number;
}

export interface PipelineWorkerStageStartedEvent extends PipelineWorkerStageEventBase {
  type: 'stage-started';
}

export interface PipelineWorkerStageCompletedEvent extends PipelineWorkerStageEventBase {
  type: 'stage-completed';
  statistics: StageStatistics;
}

export interface PipelineWorkerGenerationResult {
  worldMask: Uint8Array;
  noiseMap: Float32Array;
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
  | PipelineWorkerStageStartedEvent
  | PipelineWorkerStageCompletedEvent
  | PipelineWorkerResultResponse
  | PipelineWorkerErrorResponse;
