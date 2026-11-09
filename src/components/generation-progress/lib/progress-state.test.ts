import type { StageInfo, StageStatistics } from '@generator';

import { planProgress, ProgressTracker } from './progress-state';
import type { GenerationProgressState } from '../../../stores';

const stageInfos = [
  { id: 'world-shape', nameKey: 'stages.worldShape' },
  { id: 'macro-region', nameKey: 'stages.macroRegion' },
] as const satisfies readonly StageInfo[];

function statistics(
  stageId: string,
  status: 'completed' | 'failed' | 'skipped',
  durationMs: number
): StageStatistics {
  return {
    stageId,
    stageNameKey: 'stages.worldShape',
    status,
    startedAt: 0,
    finishedAt: durationMs,
    durationMs,
  };
}

function createTracker(skippedStageIds: readonly string[] = []) {
  const states: GenerationProgressState[] = [];
  const tracker = new ProgressTracker(stageInfos, state => states.push(state), skippedStageIds);
  return {
    tracker,
    latest: () => {
      const state = states.at(-1);
      if (!state) {
        throw new Error('Expected a progress state.');
      }
      return state;
    },
  };
}

describe('ProgressTracker', () => {
  it('seeds every stage as pending on start', () => {
    const { tracker, latest } = createTracker();

    tracker.start();

    expect(latest()).toEqual({
      status: 'running',
      startedAt: expect.any(Number),
      stages: [
        { id: 'world-shape', nameKey: 'stages.worldShape', status: 'pending', percentage: 0 },
        { id: 'macro-region', nameKey: 'stages.macroRegion', status: 'pending', percentage: 0 },
      ],
    });
  });

  it('seeds reused stages as skipped before the run reports', () => {
    const { tracker, latest } = createTracker(['world-shape']);

    tracker.start();

    expect(latest().stages).toEqual([
      { id: 'world-shape', nameKey: 'stages.worldShape', status: 'skipped', percentage: 0 },
      { id: 'macro-region', nameKey: 'stages.macroRegion', status: 'pending', percentage: 0 },
    ]);
  });

  it('marks a stage running, then completed with its duration', () => {
    const { tracker, latest } = createTracker();
    tracker.start();

    tracker.handle({
      type: 'stage-started',
      stageId: 'world-shape',
      stageNameKey: 'stages.worldShape',
      stageIndex: 0,
      stageCount: 2,
    });
    expect(latest().stages[0]).toMatchObject({ status: 'running' });

    tracker.handle({
      type: 'stage-completed',
      stageId: 'world-shape',
      stageNameKey: 'stages.worldShape',
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
      stageId: 'macro-region',
      stageNameKey: 'stages.macroRegion',
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
      stageId: 'macro-region',
      stageNameKey: 'stages.macroRegion',
      stageIndex: 0,
      stageCount: 2,
      progress: 0.42,
    });

    expect(latest().stages[0]).toMatchObject({ id: 'world-shape', status: 'pending' });
    expect(latest().stages[1]).toMatchObject({
      id: 'macro-region',
      status: 'running',
      percentage: 42,
    });
  });

  it('marks the whole run failed when a stage fails', () => {
    const { tracker, latest } = createTracker();
    tracker.start();

    tracker.handle({
      type: 'stage-failed',
      stageId: 'macro-region',
      stageNameKey: 'stages.macroRegion',
      stageIndex: 1,
      stageCount: 2,
      statistics: statistics('macro-region', 'failed', 30),
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
      stageNameKey: 'stages.worldShape',
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
        { id: 'world-shape', nameKey: 'stages.worldShape' },
        { id: 'macro-region', nameKey: 'stages.macroRegion' },
        { id: 'geology', nameKey: 'stages.geology' },
      ],
      ['world-shape', 'macro-region']
    );

    expect(planned).toEqual({
      status: 'running',
      startedAt: expect.any(Number),
      stages: [
        { id: 'world-shape', nameKey: 'stages.worldShape', status: 'skipped', percentage: 0 },
        { id: 'macro-region', nameKey: 'stages.macroRegion', status: 'skipped', percentage: 0 },
        { id: 'geology', nameKey: 'stages.geology', status: 'pending', percentage: 0 },
      ],
    });
  });
});
