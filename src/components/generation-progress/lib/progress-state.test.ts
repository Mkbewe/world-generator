import { planProgress, ProgressTracker, restartProgress } from './progress-state';
import type { GenerationProgressState } from './progress-types';
import type { StageStatistics } from '../../../utils/map-generator';

const stageInfos = [
  { id: 'world-shape', name: 'World shape generation' },
  { id: 'noise', name: 'Noise generation' },
];

function statistics(
  stageId: string,
  status: 'completed' | 'failed' | 'skipped',
  durationMs: number
): StageStatistics {
  return {
    stageId,
    stageName: stageId,
    status,
    startedAt: 0,
    finishedAt: durationMs,
    durationMs,
  };
}

function createTracker(skippedStageIds: readonly string[] = []) {
  const states: GenerationProgressState[] = [];
  const tracker = new ProgressTracker(stageInfos, state => states.push(state), skippedStageIds);
  return { tracker, latest: () => states.at(-1)! };
}

describe('ProgressTracker', () => {
  it('seeds every stage as pending on start', () => {
    const { tracker, latest } = createTracker();

    tracker.start();

    expect(latest()).toEqual({
      status: 'running',
      startedAt: expect.any(Number),
      stages: [
        { id: 'world-shape', name: 'World shape generation', status: 'pending', percentage: 0 },
        { id: 'noise', name: 'Noise generation', status: 'pending', percentage: 0 },
      ],
    });
  });

  it('seeds reused stages as skipped before the run reports', () => {
    const { tracker, latest } = createTracker(['world-shape']);

    tracker.start();

    expect(latest().stages).toEqual([
      { id: 'world-shape', name: 'World shape generation', status: 'skipped', percentage: 0 },
      { id: 'noise', name: 'Noise generation', status: 'pending', percentage: 0 },
    ]);
  });

  it('marks a stage running, then completed with its duration', () => {
    const { tracker, latest } = createTracker();
    tracker.start();

    tracker.handle({
      type: 'stage-started',
      stageId: 'world-shape',
      stageName: 'World shape generation',
      stageIndex: 0,
      stageCount: 2,
    });
    expect(latest().stages[0]).toMatchObject({ status: 'running' });

    tracker.handle({
      type: 'stage-completed',
      stageId: 'world-shape',
      stageName: 'World shape generation',
      stageIndex: 0,
      stageCount: 2,
      statistics: statistics('world-shape', 'completed', 120),
      data: {},
    });
    expect(latest().stages[0]).toMatchObject({
      status: 'completed',
      percentage: 100,
      durationMs: 120,
    });
  });

  it('tracks real per-stage progress', () => {
    const { tracker, latest } = createTracker();
    tracker.start();

    tracker.handle({
      type: 'stage-progress',
      stageId: 'noise',
      stageName: 'Noise generation',
      stageIndex: 1,
      stageCount: 2,
      progress: 0.42,
    });

    expect(latest().status).toBe('running');
    expect(latest().stages[1]).toMatchObject({ status: 'running', percentage: 42 });
  });

  it('updates stages by id regardless of the reported index', () => {
    const { tracker, latest } = createTracker();
    tracker.start();

    tracker.handle({
      type: 'stage-progress',
      stageId: 'noise',
      stageName: 'Noise generation',
      stageIndex: 0,
      stageCount: 2,
      progress: 0.42,
    });

    expect(latest().stages[0]).toMatchObject({ id: 'world-shape', status: 'pending' });
    expect(latest().stages[1]).toMatchObject({ id: 'noise', status: 'running', percentage: 42 });
  });

  it('marks the whole run failed when a stage fails', () => {
    const { tracker, latest } = createTracker();
    tracker.start();

    tracker.handle({
      type: 'stage-failed',
      stageId: 'noise',
      stageName: 'Noise generation',
      stageIndex: 1,
      stageCount: 2,
      statistics: statistics('noise', 'failed', 30),
    });

    expect(latest().status).toBe('failed');
    expect(latest().stages[1]).toMatchObject({ status: 'failed', durationMs: 30 });
  });

  it('marks reused stages as skipped without touching the run status', () => {
    const { tracker, latest } = createTracker();
    tracker.start();

    tracker.handle({
      type: 'stage-skipped',
      stageId: 'world-shape',
      stageName: 'World shape generation',
      stageIndex: 0,
      stageCount: 2,
      statistics: statistics('world-shape', 'skipped', 0),
    });

    expect(latest().status).toBe('running');
    expect(latest().stages[0]).toMatchObject({ status: 'skipped', durationMs: 0 });
    expect(latest().stages[1]).toMatchObject({ status: 'pending' });
  });

  it('completes the run with the total duration', () => {
    const { tracker, latest } = createTracker();
    tracker.start();

    tracker.complete(460);

    expect(latest()).toMatchObject({ status: 'completed', totalDurationMs: 460 });
  });
});

describe('planProgress', () => {
  it('plans the known stages before a run with reused ones already skipped', () => {
    const planned = planProgress(
      [
        { id: 'world-shape', name: 'World shape generation' },
        { id: 'noise', name: 'Noise generation' },
        { id: 'macro-region', name: 'Macro region generation' },
      ],
      ['world-shape', 'noise']
    );

    expect(planned).toEqual({
      status: 'running',
      startedAt: expect.any(Number),
      stages: [
        { id: 'world-shape', name: 'World shape generation', status: 'skipped', percentage: 0 },
        { id: 'noise', name: 'Noise generation', status: 'skipped', percentage: 0 },
        { id: 'macro-region', name: 'Macro region generation', status: 'pending', percentage: 0 },
      ],
    });
  });
});

describe('restartProgress', () => {
  it('resets every stage to pending and keeps its identity', () => {
    const previous: GenerationProgressState = {
      status: 'completed',
      totalDurationMs: 460,
      stages: [
        {
          id: 'world-shape',
          name: 'World shape generation',
          status: 'completed',
          percentage: 100,
          durationMs: 120,
        },
        {
          id: 'noise',
          name: 'Noise generation',
          status: 'failed',
          percentage: 40,
          durationMs: 30,
        },
      ],
    };

    expect(restartProgress(previous)).toEqual({
      status: 'running',
      startedAt: expect.any(Number),
      stages: [
        { id: 'world-shape', name: 'World shape generation', status: 'pending', percentage: 0 },
        { id: 'noise', name: 'Noise generation', status: 'pending', percentage: 0 },
      ],
    });
  });
});
