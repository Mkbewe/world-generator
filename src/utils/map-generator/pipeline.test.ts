import { GenerationCancelledError, GenerationStageError } from './errors';
import { MapGenerator } from './pipeline';
import { createMapGenerator } from './pipeline-factory';
import type { MapStage } from './stage';
import type { MapConfig, StageData } from './types';

interface TestConfig {
  world: { seed: number };
  terrain: { seaLevel: number };
  resources: { amount: number };
}

interface TestState {
  values: string[];
}

type TestStage = MapStage<TestConfig, TestState>;

function createStage(id: string, execute: TestStage['execute']): TestStage {
  return { id, name: `${id} stage`, execute };
}

describe('MapGenerator', () => {
  it('runs stages in order using shared typed configuration and state', async () => {
    const stages = [
      createStage('terrain', async context => {
        context.state.values.push(`sea:${context.config.terrain.seaLevel}`);
        return { terrain: context.config.terrain.seaLevel };
      }),
      createStage('resources', async context => {
        context.state.values.push(`resources:${context.config.resources.amount}`);
        return { resources: context.config.resources.amount };
      }),
    ];
    const pipeline = new MapGenerator(stages);

    const result = await pipeline.generate(
      { world: { seed: 123 }, terrain: { seaLevel: 0.4 }, resources: { amount: 12 } },
      { values: [] }
    );

    expect(result.context.state.values).toEqual(['sea:0.4', 'resources:12']);
    expect(result.statistics.map(statistic => statistic.stageId)).toEqual(['terrain', 'resources']);
    expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('rejects duplicate stage ids', () => {
    const create = (): TestStage => createStage('noise', async () => ({}));

    expect(() => new MapGenerator([create(), create()])).toThrow('Duplicate stage id: "noise".');
  });

  it('reports stage lifecycle events', async () => {
    const events: string[] = [];
    let completedData: Record<string, unknown> | undefined;
    const pipeline = new MapGenerator([createStage('noise', async () => ({ noise: 0.5 }))]);

    await pipeline.generate(
      { world: { seed: 123 }, terrain: { seaLevel: 0.4 }, resources: { amount: 12 } },
      { values: [] },
      {
        onEvent: event => {
          events.push(`${event.type}:${event.stageId}`);
          if (event.type === 'stage-completed') {
            completedData = event.data;
          }
        },
      }
    );

    expect(events).toEqual(['stage-started:noise', 'stage-completed:noise']);
    expect(completedData).toEqual({ noise: 0.5 });
  });

  it('reports throttled stage progress ending at 1', async () => {
    const reported: number[] = [];
    const pipeline = new MapGenerator([
      createStage('heightmap', async (_context, _signal, report) => {
        report(0);
        report(0.5);
        report(0.5);
        report(0.501);
        report(1);
        return {};
      }),
    ]);

    await pipeline.generate(
      { world: { seed: 123 }, terrain: { seaLevel: 0.4 }, resources: { amount: 12 } },
      { values: [] },
      {
        onEvent: event => {
          if (event.type === 'stage-progress') {
            reported.push(event.progress);
          }
        },
      }
    );

    expect(reported).toEqual([0, 0.5, 1]);
  });

  it('quantizes progress by the stage step', async () => {
    const reported: number[] = [];
    const pipeline = new MapGenerator([
      {
        ...createStage('heightmap', async (_context, _signal, report) => {
          report(0.1);
          report(0.4);
          report(0.6);
          report(0.9);
          report(1);
          return {};
        }),
        progressStep: 0.5,
      },
    ]);

    await pipeline.generate(
      { world: { seed: 123 }, terrain: { seaLevel: 0.4 }, resources: { amount: 12 } },
      { values: [] },
      {
        onEvent: event => {
          if (event.type === 'stage-progress') {
            reported.push(event.progress);
          }
        },
      }
    );

    expect(reported).toEqual([0, 0.5, 1]);
  });

  it('wraps a stage failure with stage information', async () => {
    const failure = new Error('failure');
    const pipeline = new MapGenerator([
      createStage('heightmap', async () => {
        throw failure;
      }),
    ]);

    const generation = pipeline.generate(
      { world: { seed: 123 }, terrain: { seaLevel: 0.4 }, resources: { amount: 12 } },
      { values: [] }
    );

    await expect(generation).rejects.toMatchObject({
      name: GenerationStageError.name,
      stageId: 'heightmap',
      cause: failure,
      stageStatistics: {
        stageId: 'heightmap',
        status: 'failed',
        durationMs: expect.any(Number),
      },
      generationStatistics: [
        {
          stageId: 'heightmap',
          status: 'failed',
          durationMs: expect.any(Number),
        },
      ],
    });
  });

  it('fails a stage whose output validation rejects the shared state', async () => {
    const failure = new Error('incomplete output');
    const events: string[] = [];
    const stage: TestStage = {
      ...createStage('heightmap', async () => ({ heightmap: new Float32Array(1) })),
      validate: () => {
        throw failure;
      },
    };
    const pipeline = new MapGenerator([stage]);

    const generation = pipeline.generate(
      { world: { seed: 123 }, terrain: { seaLevel: 0.4 }, resources: { amount: 12 } },
      { values: [] },
      {
        onEvent: event => {
          events.push(`${event.type}:${event.stageId}`);
        },
      }
    );

    await expect(generation).rejects.toMatchObject({
      name: GenerationStageError.name,
      stageId: 'heightmap',
      cause: failure,
    });
    expect(events).toEqual(['stage-started:heightmap', 'stage-failed:heightmap']);
  });

  it('hands out a read-only snapshot of the completed stage data', async () => {
    const config: MapConfig = {
      world: { width: 2, height: 2, seed: 7 },
      noise: { frequency: 4, octaves: 2, persistence: 0.5, lacunarity: 2 },
    };
    let eventData: Readonly<StageData> | undefined;
    const pipeline = createMapGenerator();

    const result = await pipeline.generate(
      config,
      {},
      {
        onEvent: event => {
          if (event.type === 'stage-completed' && !eventData) {
            eventData = event.data;
          }
        },
      }
    );

    expect(Object.isFrozen(eventData)).toBe(true);
    expect(eventData?.worldMask).toBe(result.context.state.worldMask);
    expect(() => {
      (eventData as StageData).worldMask = undefined;
    }).toThrow();
    expect(result.context.state.worldMask).toBeInstanceOf(Uint8Array);
  });

  it('reports a real stage error even when the signal was aborted meanwhile', async () => {
    const controller = new AbortController();
    const failure = new Error('real failure');
    const pipeline = new MapGenerator([
      createStage('heightmap', async () => {
        controller.abort();
        throw failure;
      }),
    ]);

    const generation = pipeline.generate(
      { world: { seed: 123 }, terrain: { seaLevel: 0.4 }, resources: { amount: 12 } },
      { values: [] },
      { signal: controller.signal }
    );

    await expect(generation).rejects.toMatchObject({
      name: GenerationStageError.name,
      stageId: 'heightmap',
      cause: failure,
    });
  });

  it('does not start generation when it was cancelled', async () => {
    const execute = vi.fn<TestStage['execute']>(async () => ({}));
    const pipeline = new MapGenerator([createStage('noise', execute)]);
    const controller = new AbortController();
    controller.abort();

    const generation = pipeline.generate(
      { world: { seed: 123 }, terrain: { seaLevel: 0.4 }, resources: { amount: 12 } },
      { values: [] },
      { signal: controller.signal }
    );

    await expect(generation).rejects.toBeInstanceOf(GenerationCancelledError);
    expect(execute).not.toHaveBeenCalled();
  });
});
