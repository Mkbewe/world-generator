import { createMapGenerator } from './pipeline-factory';
import { DOMAIN_OUTPUT_KEYS, RASTER_OUTPUT_KEYS } from './stage-outputs';
import type { MapConfig, MapState } from './types';

describe('createMapGenerator', () => {
  it('creates the current world-generation stages in order', async () => {
    const pipeline = createMapGenerator();

    expect(pipeline.stages.map(stage => stage.id)).toEqual([
      'world-shape',
      'noise',
      'macro-region',
      'landmass-layout',
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
      'landmass-layout',
    ]);
    expect(result.context.state.worldMask).toBeInstanceOf(Uint8Array);
    expect(result.context.state.macroRegionIdMap).toBeInstanceOf(Uint8Array);
    expect(result.context.state.noiseMap).toBeInstanceOf(Float32Array);
    expect(result.context.state.landmassLayout?.structures.length).toBeGreaterThan(0);
  });

  it('declares the configuration inputs of every stage', () => {
    const pipeline = createMapGenerator();

    expect(
      pipeline.stages.map(stage => ({
        id: stage.id,
        reads: [...(stage.reads ?? [])],
        writes: [...(stage.writes ?? [])],
        configKeys: [...stage.configKeys],
      }))
    ).toEqual([
      {
        id: 'world-shape',
        reads: [],
        writes: ['worldMask'],
        configKeys: ['world.dimensions', 'world.shape'],
      },
      {
        id: 'noise',
        reads: ['worldMask'],
        writes: ['noiseMap'],
        configKeys: ['world.seed', 'world.shape', 'world.dimensions', 'noise'],
      },
      {
        id: 'macro-region',
        reads: ['worldMask'],
        writes: ['macroRegionIdMap'],
        configKeys: [
          'world.seed',
          'world.shape',
          'world.dimensions',
          'macroRegions',
          'macroRegionDeformation',
        ],
      },
      {
        id: 'landmass-layout',
        reads: ['worldMask'],
        writes: ['landmassLayout'],
        configKeys: ['world.seed', 'world.shape', 'world.dimensions', 'landmasses'],
      },
    ]);
  });

  it('classifies every stage write as a raster or domain output', () => {
    const pipeline = createMapGenerator();
    const classified = new Set<keyof MapState>([...RASTER_OUTPUT_KEYS, ...DOMAIN_OUTPUT_KEYS]);

    expect(pipeline.stages.length).toBeGreaterThan(0);
    for (const stage of pipeline.stages) {
      for (const key of stage.writes ?? []) {
        expect(classified.has(key)).toBe(true);
      }
    }
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
