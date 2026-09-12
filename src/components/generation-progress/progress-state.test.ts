import type { GenerationProgressState } from './generation-progress';
import { ProgressTracker } from './progress-state';
import type { StageStatistics } from '../../utils/map-generator';

const stageInfos = [
  { id: 'world-shape', name: 'World shape generation' },
  { id: 'noise', name: 'Noise generation' },
];

function statistics(
  stageId: string,
  status: 'completed' | 'failed',
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

function createTracker() {
  const states: GenerationProgressState[] = [];
  const tracker = new ProgressTracker(stageInfos, state => states.push(state));
  return { tracker, latest: () => states.at(-1)! };
}

describe('ProgressTracker', () => {
  it('seeds every stage as pending on start', () => {
    const { tracker, latest } = createTracker();

    tracker.start();

    expect(latest()).toEqual({
      status: 'running',
      stages: [
        { id: 'world-shape', name: 'World shape generation', status: 'pending', percentage: 0 },
        { id: 'noise', name: 'Noise generation', status: 'pending', percentage: 0 },
      ],
    });
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

  it('completes the run with the total duration', () => {
    const { tracker, latest } = createTracker();
    tracker.start();

    tracker.complete(460);

    expect(latest()).toMatchObject({ status: 'completed', totalDurationMs: 460 });
  });
});
