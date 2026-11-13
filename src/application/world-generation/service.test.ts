import {
  DEFAULT_MACRO_REGIONS,
  GenerationCancelledError,
  type GenerationEvent,
  type MapConfig,
  type PipelineWorkerGenerationResult,
  type RunGeneration,
  type StageInfo,
  type StageStatistics,
} from '@generator';
import { PIPELINE_STAGES } from '@generator/pipeline/stage-definitions';
import type { MapRasters } from '@layers';

import { WorldGenerationService } from './service';
import type {
  WorldGenerationCache,
  WorldGenerationCacheEntry,
  WorldGenerationRun,
  WorldGenerationSnapshot,
  WorldGenerationStageUpdate,
} from './types';

const config: MapConfig = {
  world: {
    dimensions: { widthMeters: 2, heightMeters: 2, sampleWidth: 2, sampleHeight: 2 },
    seed: 17,
    shape: 'disc',
  },
};

const stages: readonly StageInfo[] = [
  { id: 'world-shape', nameKey: 'stages.worldShape' },
  { id: 'macro-region', nameKey: 'stages.macroRegion' },
];

function completed(stageId: string, data: Record<string, unknown>): GenerationEvent {
  return {
    type: 'stage-completed',
    stageId,
    stageNameKey: 'stages.worldShape',
    stageIndex: stageId === 'world-shape' ? 0 : 1,
    stageCount: 2,
    statistics: {
      stageId,
      stageNameKey: 'stages.worldShape',
      status: 'completed',
      startedAt: 0,
      finishedAt: 1,
      durationMs: 1,
    },
    data,
  };
}

function stageStatistics(
  stageId: string,
  status: StageStatistics['status'],
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

function createCache(initial?: WorldGenerationCacheEntry) {
  let entry = initial;
  return {
    cache: {
      get: vi.fn(() => entry),
      save: vi.fn((snapshot: WorldGenerationSnapshot) => {
        entry = snapshot;
      }),
      clear: vi.fn(() => {
        entry = undefined;
      }),
    } satisfies WorldGenerationCache,
    saved: () => entry,
  };
}

function createRunner(
  result: PipelineWorkerGenerationResult
): ReturnType<typeof vi.fn<RunGeneration>> {
  const runner = vi.fn<RunGeneration>();
  runner.mockResolvedValue(result);
  return runner;
}

describe('WorldGenerationService', () => {
  it('runs with fake ports and saves the successful snapshot', async () => {
    const mask = new Uint8Array(4).fill(1);
    const regions = new Uint8Array(4);
    const runner = vi.fn<RunGeneration>(async (_, options) => {
      options?.onStages?.(stages, []);
      options?.onEvent?.(completed('world-shape', { worldMask: mask }));
      options?.onEvent?.(completed('macro-region', { macroRegionIdMap: regions }));
      return {
        statistics: [
          stageStatistics('world-shape', 'completed', 2),
          stageStatistics('macro-region', 'completed', 1),
        ],
        totalDurationMs: 3,
      };
    });
    const { cache, saved } = createCache();
    const service = new WorldGenerationService(runner, cache);
    const starts: { run: WorldGenerationRun; layers: MapRasters }[] = [];
    const updates: WorldGenerationStageUpdate[] = [];
    const events: GenerationEvent[] = [];

    const result = await service.generate(config, {
      onStart: (run, layers) => starts.push({ run, layers: { ...layers } }),
      onStage: update => updates.push(update),
      onEvent: event => events.push(event),
    });

    expect(result).toMatchObject({ totalDurationMs: 3 });
    expect(starts).toHaveLength(1);
    expect(starts[0].run).toMatchObject({
      width: 2,
      height: 2,
      seed: '17',
      shape: 'disc',
      regionGeometry: { seed: 17, deformation: { amplitude: 0.08 } },
    });
    expect(starts[0].layers).toEqual({});
    expect(updates).toHaveLength(2);
    expect(updates[0].rasters).toMatchObject({ worldMask: mask });
    expect(updates[1].rasters).toMatchObject({ macroRegionIdMap: regions });
    expect(updates[1].layers).toMatchObject({ worldMask: mask, macroRegionIdMap: regions });
    expect(events.map(event => event.type)).toEqual(['stage-completed', 'stage-completed']);
    expect(saved()).toMatchObject({
      width: 2,
      height: 2,
      seed: '17',
      shape: 'disc',
      layers: { worldMask: mask, macroRegionIdMap: regions },
    });
  });

  it('reports planned and announced stages without depending on React', async () => {
    const runner = vi.fn<RunGeneration>(async (_, options) => {
      options?.onStages?.(stages, []);
      return { statistics: [], totalDurationMs: 1 };
    });
    const { cache } = createCache();
    const service = new WorldGenerationService(runner, cache);
    const planned = vi.fn();
    const announced = vi.fn();

    await service.generate(config, {
      onPlannedStages: planned,
      onStages: announced,
    });
    expect(planned).not.toHaveBeenCalled();
    expect(announced).toHaveBeenCalledWith(stages, []);

    runner.mockImplementation(async (_, options) => {
      options?.onStages?.(stages, []);
      return { statistics: [], totalDurationMs: 1 };
    });

    await service.generate(
      { ...config, macroRegions: DEFAULT_MACRO_REGIONS },
      { onPlannedStages: planned, onStages: announced }
    );

    expect(planned).toHaveBeenCalledWith(stages, ['world-shape']);
    expect(announced).toHaveBeenLastCalledWith(stages, []);
    expect(runner.mock.lastCall?.[1]?.reuse.dirtyStageIds).toEqual(['macro-region']);
  });

  it('drops a cache entry with keys outside the persistent output set', async () => {
    const layers = {
      worldMask: new Uint8Array(4),
      legacyMap: new Uint8Array(4),
    };
    const { cache, saved } = createCache({ layers });
    const runner = createRunner({ statistics: [], totalDurationMs: 1 });
    const service = new WorldGenerationService(runner, cache);

    await service.generate(config);

    expect(cache.clear).toHaveBeenCalledOnce();
    expect(runner.mock.lastCall?.[1]?.reuse.dirtyStageIds).toEqual(
      PIPELINE_STAGES.map(stage => stage.id)
    );
    expect(saved()?.layers).not.toHaveProperty('legacyMap');
  });

  it('keeps the saved snapshot and the regeneration baseline when a run fails', async () => {
    const runner = createRunner({ statistics: [], totalDurationMs: 1 });
    const { cache, saved } = createCache();
    const service = new WorldGenerationService(runner, cache);
    await service.generate(config);
    const first = saved();

    runner.mockRejectedValueOnce(new Error('generation failed'));
    await expect(
      service.generate({ ...config, macroRegions: DEFAULT_MACRO_REGIONS })
    ).rejects.toThrow('generation failed');

    expect(saved()).toBe(first);
    runner.mockResolvedValueOnce({ statistics: [], totalDurationMs: 1 });
    await service.generate({ ...config, macroRegions: DEFAULT_MACRO_REGIONS });
    expect(runner.mock.lastCall?.[1]?.reuse.dirtyStageIds).toEqual(['macro-region']);
  });

  it('passes the cached rasters and domain outputs to the reuse plan', async () => {
    const mask = new Uint8Array(4).fill(1);
    const runner = createRunner({ statistics: [], totalDurationMs: 1 });
    const { cache } = createCache({
      layers: { worldMask: mask },
      info: { macroRegionAreas: [1] },
    });
    const service = new WorldGenerationService(runner, cache);

    await service.generate(config);

    expect(runner.mock.lastCall?.[1]?.reuse.cachedState).toEqual({
      worldMask: mask,
      macroRegionAreas: [1],
    });
  });

  it('rejects invalid stage output without replacing the saved snapshot', async () => {
    const mask = new Uint8Array(4).fill(1);
    const runner = vi.fn<RunGeneration>(async (_, options) => {
      options?.onStages?.(stages, []);
      options?.onEvent?.(completed('world-shape', { worldMask: 'nope' }));
      return { statistics: [], totalDurationMs: 1 };
    });
    const { cache, saved } = createCache({ layers: { worldMask: mask } });
    const service = new WorldGenerationService(runner, cache);

    await expect(service.generate(config)).rejects.toThrow('invalid type');
    expect(saved()?.layers.worldMask).toBe(mask);
  });

  it('keeps the real statistics of stages reused by the next run', async () => {
    const runner = vi.fn<RunGeneration>();
    runner
      .mockResolvedValueOnce({
        statistics: [
          stageStatistics('world-shape', 'completed', 120),
          stageStatistics('macro-region', 'completed', 40),
        ],
        totalDurationMs: 160,
      })
      .mockResolvedValueOnce({
        statistics: [
          stageStatistics('world-shape', 'skipped', 0),
          stageStatistics('macro-region', 'completed', 40),
        ],
        totalDurationMs: 40,
      });
    const { cache } = createCache();
    const service = new WorldGenerationService(runner, cache);

    await service.generate(config);
    const second = await service.generate({
      ...config,
      macroRegions: DEFAULT_MACRO_REGIONS,
    });

    expect(
      second?.statistics.map(stage => [stage.stageId, stage.status, stage.durationMs])
    ).toEqual([
      ['world-shape', 'skipped', 120],
      ['macro-region', 'completed', 40],
    ]);
    expect(second?.totalDurationMs).toBe(40);
  });

  it('returns no result and keeps the saved map when cancelled', async () => {
    const mask = new Uint8Array(4).fill(1);
    const runner = vi.fn<RunGeneration>((_, options) => {
      return new Promise((_, reject) => {
        options?.signal?.addEventListener('abort', () => reject(new GenerationCancelledError()));
      });
    });
    const { cache, saved } = createCache({ layers: { worldMask: mask } });
    const service = new WorldGenerationService(runner, cache);

    const run = service.generate(config);
    service.cancel();

    await expect(run).resolves.toBeUndefined();
    expect(saved()?.layers.worldMask).toBe(mask);
  });

  it('lets a superseding run own the result', async () => {
    const secondMask = new Uint8Array(4).fill(2);
    let finishFirst: (result: PipelineWorkerGenerationResult) => void = () => {};
    const runner = vi
      .fn<RunGeneration>()
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            finishFirst = resolve;
          })
      )
      .mockImplementationOnce(async (_, options) => {
        options?.onStages?.(stages, []);
        options?.onEvent?.(completed('world-shape', { worldMask: secondMask }));
        return { statistics: [], totalDurationMs: 2 };
      });
    const { cache, saved } = createCache();
    const service = new WorldGenerationService(runner, cache);

    const first = service.generate(config);
    const second = service.generate(config);

    await expect(second).resolves.toMatchObject({ totalDurationMs: 2 });
    expect(saved()?.layers.worldMask).toBe(secondMask);

    finishFirst({ statistics: [], totalDurationMs: 1 });
    await expect(first).resolves.toBeUndefined();
    expect(saved()?.layers.worldMask).toBe(secondMask);
  });
});
