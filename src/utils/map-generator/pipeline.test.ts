import { GenerationCancelledError, GenerationStageError } from './errors';
import { MapGenerator } from './pipeline';
import type { MapStage } from './stage';

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
      }),
      createStage('resources', async context => {
        context.state.values.push(`resources:${context.config.resources.amount}`);
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

  it('reports stage lifecycle events', async () => {
    const events: string[] = [];
    const pipeline = new MapGenerator([createStage('noise', async () => {})]);

    await pipeline.generate(
      { world: { seed: 123 }, terrain: { seaLevel: 0.4 }, resources: { amount: 12 } },
      { values: [] },
      { onEvent: event => events.push(`${event.type}:${event.stageId}`) }
    );

    expect(events).toEqual(['stage-started:noise', 'stage-completed:noise']);
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

  it('does not start generation when it was cancelled', async () => {
    const execute = vi.fn<TestStage['execute']>();
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
