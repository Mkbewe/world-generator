import {
  isPipelineWorkerGenerateRequest,
  isPipelineWorkerResponse,
} from './pipeline-worker.guards';
import type {
  PipelineWorkerGenerateRequest,
  PipelineWorkerResponse,
} from './pipeline-worker.types';
import type { StageStatistics } from '../types';

const statistics: StageStatistics = {
  stageId: 'geology',
  stageNameKey: 'stages.geology',
  status: 'completed',
  startedAt: 0,
  finishedAt: 1,
  durationMs: 1,
};

const responses: PipelineWorkerResponse[] = [
  {
    type: 'stages',
    stages: [{ id: 'geology', nameKey: 'stages.geology' }],
    skippedStageIds: [],
  },
  {
    type: 'stage-started',
    stageId: 'geology',
    stageNameKey: 'stages.geology',
    stageIndex: 0,
    stageCount: 1,
  },
  {
    type: 'stage-progress',
    stageId: 'geology',
    stageNameKey: 'stages.geology',
    stageIndex: 0,
    stageCount: 1,
    progress: 0.5,
  },
  {
    type: 'stage-completed',
    stageId: 'geology',
    stageNameKey: 'stages.geology',
    stageIndex: 0,
    stageCount: 1,
    statistics,
    data: {},
  },
  {
    type: 'stage-failed',
    stageId: 'geology',
    stageNameKey: 'stages.geology',
    stageIndex: 0,
    stageCount: 1,
    statistics,
  },
  {
    type: 'stage-skipped',
    stageId: 'geology',
    stageNameKey: 'stages.geology',
    stageIndex: 0,
    stageCount: 1,
    statistics,
  },
  { type: 'result', result: { statistics: [statistics], totalDurationMs: 1 } },
  { type: 'error', message: 'Generation failed.' },
];

const request: PipelineWorkerGenerateRequest = {
  type: 'generate',
  config: {
    world: {
      dimensions: { widthMeters: 2, heightMeters: 2, sampleWidth: 2, sampleHeight: 2 },
      seed: 7,
      shape: 'disc',
    },
  },
  reuse: {
    dirtyStageIds: ['geology'],
    cachedState: {},
  },
};

describe('isPipelineWorkerResponse', () => {
  it('accepts every supported worker response', () => {
    for (const response of responses) {
      expect(isPipelineWorkerResponse(response)).toBe(true);
    }
  });

  it('rejects malformed messages', () => {
    expect(isPipelineWorkerResponse(null)).toBe(false);
    expect(isPipelineWorkerResponse({ type: 'unknown' })).toBe(false);
    expect(isPipelineWorkerResponse({ type: 'error', message: 1 })).toBe(false);
    expect(
      isPipelineWorkerResponse({
        type: 'stages',
        stages: [{ id: 'unknown', nameKey: 'stages.geology' }],
        skippedStageIds: [],
      })
    ).toBe(false);
    expect(
      isPipelineWorkerResponse({
        type: 'stage-progress',
        stageId: 'geology',
        stageNameKey: 'stages.geology',
        stageIndex: 0,
        stageCount: 1,
      })
    ).toBe(false);
    expect(
      isPipelineWorkerResponse({
        type: 'result',
        result: { statistics: [], totalDurationMs: 'fast' },
      })
    ).toBe(false);
  });
});

describe('isPipelineWorkerGenerateRequest', () => {
  it('accepts a supported request', () => {
    expect(isPipelineWorkerGenerateRequest(request)).toBe(true);
  });

  it('rejects malformed requests', () => {
    expect(isPipelineWorkerGenerateRequest(null)).toBe(false);
    expect(isPipelineWorkerGenerateRequest({ type: 'generate' })).toBe(false);
    expect(
      isPipelineWorkerGenerateRequest({
        ...request,
        reuse: { ...request.reuse, dirtyStageIds: ['unknown'] },
      })
    ).toBe(false);
    expect(
      isPipelineWorkerGenerateRequest({
        ...request,
        reuse: { ...request.reuse, cachedState: [] },
      })
    ).toBe(false);
  });
});
