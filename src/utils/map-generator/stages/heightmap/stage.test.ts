import { DEFAULT_HEIGHTMAP_CONFIG } from './defaults';
import { HeightmapStage } from './stage';
import { MapGenerator } from '../../pipeline/pipeline';
import type { HeightmapConfig, LandmassLayout, MapConfig, MapState } from '../../types';
import { LandmassLayoutStage } from '../landmass';
import { StructureCharacterStage } from '../structure-character';

const base: MapConfig = {
  world: {
    dimensions: { widthMeters: 2000, heightMeters: 2000, sampleWidth: 32, sampleHeight: 32 },
    seed: 17,
    shape: 'disc',
  },
  noise: { frequency: 4, octaves: 2, persistence: 0.5, lacunarity: 2 },
};

const LANDMASSES = {
  count: 3,
  size: 0.5,
  diversity: 0.3,
  shelf: { width: 0.05, targetDepth: 60, falloff: 0.5, irregularity: 0.3 },
};

function config(heightmap: Partial<HeightmapConfig> = {}): MapConfig {
  return {
    ...base,
    landmasses: LANDMASSES,
    structureCharacter: { characterVariation: 0.5, terrainBias: 0.5 },
    heightmap: { ...DEFAULT_HEIGHTMAP_CONFIG, ...heightmap },
  };
}

const WORLD_MASK = new Uint8Array(32 * 32).fill(1);

async function generate(source: MapConfig = config()) {
  return new MapGenerator<MapConfig, MapState>([
    new LandmassLayoutStage(),
    new StructureCharacterStage(),
    new HeightmapStage(),
  ]).generate(source, { worldMask: WORLD_MASK, noiseMap: new Float32Array(32 * 32) });
}

const EMPTY_LAYOUT: LandmassLayout = { structures: [], shelves: [] };

describe('HeightmapStage', () => {
  it('produces a heightmap and a shelf index for the generated layout', async () => {
    const result = await generate();
    const { heightmap, shelfIndexMap, worldMask } = result.context.state;

    expect(heightmap).toBeInstanceOf(Float32Array);
    expect(shelfIndexMap).toBeInstanceOf(Int16Array);
    expect(heightmap).toHaveLength(WORLD_MASK.length);
    expect(heightmap?.every(value => Number.isFinite(value))).toBe(true);
    expect(worldMask).toBeInstanceOf(Uint8Array);
  });

  it('keeps the land above and the ocean below the sea datum', async () => {
    const result = await generate();
    const heightmap = result.context.state.heightmap ?? new Float32Array();
    const values = [...heightmap];

    expect(Math.max(...values)).toBeGreaterThan(0);
    expect(Math.min(...values)).toBeLessThanOrEqual(0);
  });

  it('is deterministic per seed', async () => {
    const first = await generate();
    const second = await generate();

    expect(second.context.state.heightmap).toEqual(first.context.state.heightmap);
    expect(second.context.state.shelfIndexMap).toEqual(first.context.state.shelfIndexMap);
  });

  it('reports height statistics', async () => {
    const result = await generate();
    const stats = result.statistics.find(candidate => candidate.stageId === 'heightmap');

    expect(stats?.details?.max).toBeGreaterThan(0);
    expect(typeof stats?.details?.mean).toBe('number');
    expect(typeof stats?.details?.landShare).toBe('number');
  });

  it('produces an empty heightmap for an empty layout', async () => {
    const result = await new MapGenerator<MapConfig, MapState>([new HeightmapStage()]).generate(
      {
        ...config(),
        structureCharacter: { characterVariation: 0.5, terrainBias: 0.5 },
      },
      {
        worldMask: WORLD_MASK,
        landmassLayout: EMPTY_LAYOUT,
        structureZones: [],
        noiseMap: new Float32Array(32 * 32),
      }
    );

    expect(result.context.state.heightmap).toBeInstanceOf(Float32Array);
  });

  it('rejects invalid configuration', async () => {
    await expect(generate(config({ relief: 1.5 }))).rejects.toMatchObject({
      cause: { name: 'RangeError' },
    });
  });

  it('requires a landmass layout', async () => {
    const pipeline = new MapGenerator<MapConfig, MapState>([new HeightmapStage()]);

    await expect(
      pipeline.generate(config(), { worldMask: WORLD_MASK, noiseMap: new Float32Array(32 * 32) })
    ).rejects.toMatchObject({
      cause: { message: expect.stringContaining('landmassLayout') },
    });
  });
});
