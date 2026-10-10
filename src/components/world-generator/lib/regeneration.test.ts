import { SelectiveRegeneration } from './regeneration';
import {
  DEFAULT_MACRO_REGIONS,
  type MapConfig,
  type StageInfo,
  type StageStatistics,
} from '../../../utils/map-generator';
import { PIPELINE_STAGES } from '../../../utils/map-generator/pipeline/stage-definitions';

const config: MapConfig = {
  world: {
    dimensions: { widthMeters: 2, heightMeters: 2, sampleWidth: 2, sampleHeight: 2 },
    seed: 17,
    shape: 'disc',
  },
};

const stages: readonly StageInfo[] = [
  { id: 'world-shape', name: 'World shape' },
  { id: 'macro-region', name: 'Macro region' },
  { id: 'geology', name: 'Geology' },
];

function stageStatistics(
  stageId: string,
  status: StageStatistics['status'],
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

describe('SelectiveRegeneration', () => {
  it('marks every stage dirty before the first saved map', () => {
    const regeneration = new SelectiveRegeneration();

    const plan = regeneration.plan(config, {});

    expect(plan).toEqual({
      dirtyStageIds: PIPELINE_STAGES.map(stage => stage.id),
      cachedState: {},
    });
    expect(regeneration.reusedStageIds).toEqual([]);
  });

  it('reuses the clean stages of the saved map', () => {
    const regeneration = new SelectiveRegeneration();
    regeneration.plan(config, {});
    regeneration.remember(config);
    regeneration.announce(stages);

    const plan = regeneration.plan({ ...config, macroRegions: DEFAULT_MACRO_REGIONS }, {});

    expect(plan.dirtyStageIds).toEqual(['macro-region']);
    expect(regeneration.reusedStageIds).toEqual(['world-shape', 'geology']);
  });

  it('keeps the real costs of the stages a run reuses', () => {
    const regeneration = new SelectiveRegeneration();
    const real = stageStatistics('world-shape', 'completed', 120);

    expect(regeneration.mergeStatistics([real, stageStatistics('geology', 'skipped', 0)])).toEqual([
      real,
      stageStatistics('geology', 'skipped', 0),
    ]);

    expect(regeneration.mergeStatistics([stageStatistics('world-shape', 'skipped', 0)])).toEqual([
      { ...real, status: 'skipped' },
    ]);
  });

  it('forgets the saved map and its baseline on reset', () => {
    const regeneration = new SelectiveRegeneration();
    regeneration.plan(config, {});
    regeneration.remember(config);
    regeneration.announce(stages);

    regeneration.reset();

    expect(regeneration.announcedStages).toEqual([]);
    expect(regeneration.plan(config, {}).dirtyStageIds).toEqual(
      PIPELINE_STAGES.map(stage => stage.id)
    );
  });
});
