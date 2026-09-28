import { DEFAULT_HEIGHTMAP_CONFIG } from './defaults';
import { HeightmapStage } from './stage';
import { MapGenerator } from '../../pipeline/pipeline';
import type { HeightmapConfig, MapConfig, MapState } from '../../types';
import { createGeologicalArea, GeologyStage } from '../geology';

const base: MapConfig = {
  world: {
    dimensions: { widthMeters: 2000, heightMeters: 2000, sampleWidth: 32, sampleHeight: 32 },
    seed: 17,
    shape: 'disc',
  },
  noise: { frequency: 4, octaves: 2, persistence: 0.5, lacunarity: 2 },
  geology: {
    areas: [
      createGeologicalArea('area-1', 'shallow-archipelago'),
      createGeologicalArea('area-2', 'atoll'),
    ],
  },
};

function config(heightmap: Partial<HeightmapConfig> = {}): MapConfig {
  return {
    ...base,
    heightmap: { ...DEFAULT_HEIGHTMAP_CONFIG, ...heightmap },
  };
}

const WORLD_MASK = new Uint8Array(32 * 32).fill(1);

async function generate(source: MapConfig = config()) {
  return new MapGenerator<MapConfig, MapState>([new GeologyStage(), new HeightmapStage()]).generate(
    source,
    { worldMask: WORLD_MASK }
  );
}

describe('HeightmapStage', () => {
  it('produces a heightmap and a provenance map for the plan', async () => {
    const result = await generate();
    const { heightmap, provenanceMap, worldMask } = result.context.state;

    expect(heightmap).toBeInstanceOf(Float32Array);
    expect(provenanceMap).toBeInstanceOf(Int16Array);
    expect(heightmap).toHaveLength(WORLD_MASK.length);
    expect(provenanceMap).toHaveLength(WORLD_MASK.length);
    expect([...(heightmap ?? [])].every(Number.isFinite)).toBe(true);
    expect(worldMask).toBeInstanceOf(Uint8Array);
  });

  it('keeps the land above and the ocean below the sea datum', async () => {
    const result = await generate();
    const values = [...(result.context.state.heightmap ?? [])];

    expect(Math.max(...values)).toBeGreaterThan(0);
    expect(Math.min(...values)).toBeLessThanOrEqual(0);
  });

  it('is deterministic per seed', async () => {
    const first = await generate();
    const second = await generate();

    expect(second.context.state.heightmap).toEqual(first.context.state.heightmap);
    expect(second.context.state.provenanceMap).toEqual(first.context.state.provenanceMap);
  });

  it('reports height statistics with the area count', async () => {
    const result = await generate();
    const stats = result.statistics.find(candidate => candidate.stageId === 'heightmap');

    expect(stats?.details?.max).toBeGreaterThan(0);
    expect(typeof stats?.details?.mean).toBe('number');
    expect(typeof stats?.details?.landShare).toBe('number');
    expect(stats?.details?.areas).toBe(2);
  });

  it('rejects invalid configuration', async () => {
    await expect(generate(config({ relief: 1.5 }))).rejects.toMatchObject({
      cause: { name: 'RangeError' },
    });
  });

  it('requires a geology plan', async () => {
    const pipeline = new MapGenerator<MapConfig, MapState>([new HeightmapStage()]);

    await expect(pipeline.generate(config(), { worldMask: WORLD_MASK })).rejects.toMatchObject({
      cause: { message: expect.stringContaining('geologyPlan') },
    });
  });
});
