import { buildProgressViewModel, type ProgressSource } from './progress-view-model';

const SOURCE: ProgressSource = {
  status: 'running',
  startedAt: 100,
  totalDurationMs: 900,
  stages: [
    {
      id: 'world-shape',
      nameKey: 'stages.worldShape',
      status: 'completed',
      percentage: 100,
      durationMs: 120,
    },
    {
      id: 'macro-region',
      nameKey: 'stages.macroRegion',
      status: 'skipped',
      percentage: 0,
      durationMs: 0,
    },
    {
      id: 'geology',
      nameKey: 'stages.geology',
      status: 'running',
      percentage: 40,
    },
    {
      id: 'heightmap',
      nameKey: 'stages.heightmap',
      status: 'failed',
      percentage: 0,
    },
  ],
};

describe('buildProgressViewModel', () => {
  it('counts completed and skipped stages and keeps the stage order', () => {
    const model = buildProgressViewModel(SOURCE);

    expect(model.completed).toBe(1);
    expect(model.skipped).toBe(1);
    expect(model.total).toBe(4);
    expect(model.stages.map(stage => stage.id)).toEqual([
      'world-shape',
      'macro-region',
      'geology',
      'heightmap',
    ]);
  });

  it('derives the trailing value of every stage', () => {
    const stages = buildProgressViewModel(SOURCE).stages;

    expect(stages[0]?.trailing).toEqual({ kind: 'duration', durationMs: 120 });
    expect(stages[1]?.trailing).toEqual({ kind: 'skipped' });
    expect(stages[2]?.trailing).toBeUndefined();
    expect(stages[3]?.trailing).toBeUndefined();
  });

  it('handles an empty stage list', () => {
    const model = buildProgressViewModel({ status: 'completed', stages: [] });

    expect(model).toMatchObject({ completed: 0, skipped: 0, total: 0, stages: [] });
  });
});
