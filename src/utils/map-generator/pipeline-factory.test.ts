import { createMapGenerator } from './pipeline-factory';
import type { MapConfig } from './types';

describe('createMapGenerator', () => {
  it('creates the current world-generation stages in order', async () => {
    const pipeline = createMapGenerator();

    expect(pipeline.stages.map(stage => stage.id)).toEqual([
      'world-shape',
      'noise',
      'macro-region',
    ]);

    const config: MapConfig = {
      world: {
        dimensions: { widthMeters: 5, heightMeters: 5, sampleWidth: 5, sampleHeight: 5 },
        seed: 123,
        shape: 'disc',
      },
      noise: { frequency: 4, octaves: 3, persistence: 0.5, lacunarity: 2 },
    };

    const result = await pipeline.generate(config, {});

    expect(result.statistics.map(statistic => statistic.stageId)).toEqual([
      'world-shape',
      'noise',
      'macro-region',
    ]);
    expect(result.context.state.worldMask).toBeInstanceOf(Uint8Array);
    expect(result.context.state.macroRegionIdMap).toBeInstanceOf(Uint8Array);
    expect(result.context.state.noiseMap).toBeInstanceOf(Float32Array);
  });

  it('declares the configuration inputs of every stage', () => {
    const pipeline = createMapGenerator();

    expect(
      pipeline.stages.map(stage => ({ id: stage.id, configKeys: [...stage.configKeys] }))
    ).toEqual([
      { id: 'world-shape', configKeys: ['world.dimensions', 'world.shape'] },
      { id: 'noise', configKeys: ['world.seed', 'world.dimensions', 'noise'] },
      {
        id: 'macro-region',
        configKeys: ['world.seed', 'world.dimensions', 'macroRegions', 'macroRegionDeformation'],
      },
    ]);
  });

  it('rejects configs above the sample budget before running any stage', async () => {
    const pipeline = createMapGenerator();
    const onEvent = vi.fn();
    const config: MapConfig = {
      world: {
        dimensions: {
          widthMeters: 20_000,
          heightMeters: 20_000,
          sampleWidth: 20_000,
          sampleHeight: 20_000,
        },
        seed: 123,
        shape: 'disc',
      },
      noise: { frequency: 4, octaves: 3, persistence: 0.5, lacunarity: 2 },
    };

    await expect(pipeline.generate(config, {}, { onEvent })).rejects.toThrow(RangeError);
    expect(onEvent).not.toHaveBeenCalled();
  });
});
