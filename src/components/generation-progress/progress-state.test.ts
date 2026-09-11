import {
  applyGenerationEvent,
  completeGenerationProgress,
  createGenerationProgress,
} from './progress-state';
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

describe('generation progress state', () => {
  it('seeds every stage as pending', () => {
    const progress = createGenerationProgress(stageInfos);

    expect(progress.status).toBe('running');
    expect(progress.stages).toEqual([
      { id: 'world-shape', name: 'World shape generation', status: 'pending', percentage: 0 },
      { id: 'noise', name: 'Noise generation', status: 'pending', percentage: 0 },
    ]);
  });

  it('marks a stage as running, then completed with its duration', () => {
    let progress = createGenerationProgress(stageInfos);

    progress = applyGenerationEvent(progress, {
      type: 'stage-started',
      stageId: 'world-shape',
      stageName: 'World shape generation',
      stageIndex: 0,
      stageCount: 2,
    });
    expect(progress.stages[0]).toMatchObject({ status: 'running' });

    progress = applyGenerationEvent(progress, {
      type: 'stage-completed',
      stageId: 'world-shape',
      stageName: 'World shape generation',
      stageIndex: 0,
      stageCount: 2,
      statistics: statistics('world-shape', 'completed', 120),
      data: {},
    });
    expect(progress.stages[0]).toMatchObject({
      status: 'completed',
      percentage: 100,
      durationMs: 120,
    });
  });

  it('marks the whole run failed when a stage fails', () => {
    const progress = applyGenerationEvent(createGenerationProgress(stageInfos), {
      type: 'stage-failed',
      stageId: 'noise',
      stageName: 'Noise generation',
      stageIndex: 1,
      stageCount: 2,
      statistics: statistics('noise', 'failed', 30),
    });

    expect(progress.status).toBe('failed');
    expect(progress.stages[1]).toMatchObject({ status: 'failed', durationMs: 30 });
  });

  it('completes the run with the total duration', () => {
    const progress = completeGenerationProgress(createGenerationProgress(stageInfos), 460);

    expect(progress).toMatchObject({ status: 'completed', totalDurationMs: 460 });
  });
});
