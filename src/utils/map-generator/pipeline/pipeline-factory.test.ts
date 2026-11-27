import { createMapGenerator } from './pipeline-factory';
import { DOMAIN_OUTPUT_KEYS, PERSISTENT_RASTER_TYPES, RASTER_OUTPUT_KEYS } from './stage-outputs';
import type { MapConfig, MapState } from '../types';

describe('createMapGenerator', () => {
  it('creates the current world-generation stages in order', async () => {
    const pipeline = createMapGenerator();

    expect(pipeline.stages.map(stage => stage.id)).toEqual([
      'world-shape',
      'macro-region',
      'base-climate',
      'geology',
      'heightmap',
      'climate',
    ]);

    const config: MapConfig = {
      world: {
        dimensions: { widthMeters: 5, heightMeters: 5, sampleWidth: 5, sampleHeight: 5 },
        seed: 123,
        shape: 'disc',
      },
    };

    const result = await pipeline.generate(config, {});

    expect(result.statistics.map(statistic => statistic.stageId)).toEqual([
      'world-shape',
      'macro-region',
      'base-climate',
      'geology',
      'heightmap',
      'climate',
    ]);
    expect(result.context.state.worldMask).toBeInstanceOf(Uint8Array);
    expect(result.context.state.macroRegionIdMap).toBeInstanceOf(Uint8Array);
    expect(result.context.state.heatZoneMap).toBeInstanceOf(Int16Array);
    expect(result.context.state.moistureBaseMap).toBeInstanceOf(Float32Array);
    expect(result.context.state.oceanCurrentMap).toBeInstanceOf(Float32Array);
    expect(result.context.state.oceanCurrentStrength).toBeInstanceOf(Float32Array);
    expect(result.context.state.geologyPlan?.regions?.length).toBeGreaterThan(0);
    expect(result.context.state.heightmap).toBeInstanceOf(Float32Array);
    expect(result.context.state.provenanceMap).toBeInstanceOf(Int16Array);
    expect(result.context.state.temperatureMap).toBeInstanceOf(Float32Array);
    expect(result.context.state.moistureMap).toBeInstanceOf(Float32Array);
    expect(result.context.state.riverMap).toBeInstanceOf(Uint8Array);
    expect(result.context.state.lakeMap).toBeInstanceOf(Uint8Array);
    expect(result.context.state.basinMap).toBeInstanceOf(Int16Array);
  });

  it('produces an identical state for the same seed and configuration', async () => {
    const config: MapConfig = {
      world: {
        dimensions: { widthMeters: 24, heightMeters: 20, sampleWidth: 24, sampleHeight: 20 },
        seed: 123,
        shape: 'disc',
      },
    };

    const first = await createMapGenerator().generate(config, {});
    const second = await createMapGenerator().generate(config, {});

    expect(second.context.state).toEqual(first.context.state);
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
        id: 'macro-region',
        reads: ['worldMask'],
        writes: ['macroRegionIdMap', 'macroRegionAreas'],
        configKeys: [
          'world.seed',
          'world.shape',
          'world.dimensions',
          'macroRegions',
          'macroRegionDeformation',
        ],
      },
      {
        id: 'base-climate',
        reads: ['worldMask'],
        writes: ['heatZoneMap', 'moistureBaseMap', 'oceanCurrentMap', 'oceanCurrentStrength'],
        configKeys: ['world.seed', 'world.shape', 'world.dimensions', 'baseClimate'],
      },
      {
        id: 'geology',
        reads: ['heatZoneMap', 'worldMask'],
        writes: ['geologyPlan'],
        configKeys: [
          'world.seed',
          'world.shape',
          'world.dimensions',
          'baseClimate.zones',
          'baseClimate.zoneIrregularity',
          'baseClimate.geologyCoupling',
          'geology',
        ],
      },
      {
        id: 'heightmap',
        reads: ['worldMask', 'geologyPlan', 'heatZoneMap'],
        writes: ['heightmap', 'provenanceMap'],
        configKeys: [
          'world.seed',
          'world.shape',
          'world.dimensions',
          'baseClimate.zones',
          'baseClimate.zoneIrregularity',
          'baseClimate.geologyCoupling',
          'geology',
          'heightmap',
        ],
      },
      {
        id: 'climate',
        reads: [
          'worldMask',
          'heatZoneMap',
          'heightmap',
          'moistureBaseMap',
          'oceanCurrentMap',
          'oceanCurrentStrength',
        ],
        writes: ['temperatureMap', 'moistureMap', 'riverMap', 'lakeMap', 'basinMap'],
        configKeys: [
          'world.seed',
          'world.shape',
          'world.dimensions',
          'baseClimate.zones',
          'baseClimate.zoneIrregularity',
          'baseClimate.geologyCoupling',
          'baseClimate.currents',
          'baseClimate.moisture',
          'baseClimate.moistureZones',
          'geology',
          'heightmap',
        ],
      },
    ]);
  });

  it('matches every persistent raster against its declared constructor', async () => {
    const pipeline = createMapGenerator();
    const config: MapConfig = {
      world: {
        dimensions: { widthMeters: 5, heightMeters: 5, sampleWidth: 5, sampleHeight: 5 },
        seed: 123,
        shape: 'disc',
      },
    };
    const constructors = {
      uint8: Uint8Array,
      float32: Float32Array,
      int16: Int16Array,
    } as const;

    const result = await pipeline.generate(config, {});

    for (const key of RASTER_OUTPUT_KEYS) {
      expect(result.context.state[key]).toBeInstanceOf(constructors[PERSISTENT_RASTER_TYPES[key]]);
    }
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
    };

    await expect(pipeline.generate(config, {}, { onEvent })).rejects.toThrow(RangeError);
    expect(onEvent).not.toHaveBeenCalled();
  });
});
