import { DEFAULT_LANDMASS_CONFIG, MAX_LANDMASSES } from './defaults';
import { structureExtent } from './influence';
import { validateLayout } from './layout-check';
import { LandmassLayoutStage } from './stage';
import { MapGenerator } from '../../pipeline/pipeline';
import type { LandmassArchetype, MapConfig, MapState } from '../../types';

const base: MapConfig = {
  world: {
    dimensions: { widthMeters: 2, heightMeters: 2, sampleWidth: 4, sampleHeight: 4 },
    seed: 17,
    shape: 'disc',
  },
  noise: { frequency: 4, octaves: 2, persistence: 0.5, lacunarity: 2 },
};

function config(overrides: Partial<MapConfig['landmasses']> = {}): MapConfig {
  return {
    ...base,
    landmasses: { ...DEFAULT_LANDMASS_CONFIG, ...overrides },
  };
}

async function generate(source: MapConfig = base) {
  return new MapGenerator<MapConfig, MapState>([new LandmassLayoutStage()]).generate(source, {
    worldMask: new Uint8Array(16).fill(1),
  });
}

describe('LandmassLayoutStage', () => {
  it('builds a valid layout of the configured size', async () => {
    const result = await generate(config({ count: 3 }));
    const layout = result.context.state.landmassLayout;

    expect(layout?.structures).toHaveLength(3);
    expect(layout?.shelves).toHaveLength(3);
    expect(layout && validateLayout(layout)).toBeUndefined();
    for (const structure of layout?.structures ?? []) {
      expect(structure.nodes.length).toBeGreaterThanOrEqual(2);
      expect(structure.edges.length).toBeGreaterThanOrEqual(1);
      expect(layout?.shelves.some(shelf => shelf.id === structure.shelfId)).toBe(true);
    }
    expect(result.statistics[0].details).toMatchObject({ structures: 3, shelves: 3 });
  });

  it('holds its invariants across a wide seed pool', async () => {
    for (const seed of Array.from({ length: 12 }, (_, index) => index + 1)) {
      const source = { ...base, world: { ...base.world, seed } };
      const result = await generate(source);
      const layout = result.context.state.landmassLayout;
      expect(layout).toBeDefined();
      if (!layout) {
        continue;
      }

      expect(() => validateLayout(layout)).not.toThrow();
      const extents = layout.structures.map(structure => structureExtent(structure));
      // The size plan caps every extent; placement may only shrink it further.
      expect(extents.every(extent => extent > 0)).toBe(true);
      expect(Math.max(...extents)).toBeLessThanOrEqual(0.6 + 1e-9);
      expect(Math.max(...extents) / Math.min(...extents)).toBeGreaterThan(1.1);
    }
  });

  it('is deterministic per seed and changes with it', async () => {
    const first = await generate();
    const second = await generate();
    const other = await generate({ ...base, world: { ...base.world, seed: 18 } });

    expect(second.context.state.landmassLayout).toEqual(first.context.state.landmassLayout);
    expect(other.context.state.landmassLayout).not.toEqual(first.context.state.landmassLayout);
  });

  it('draws no structures for an explicitly empty pool', async () => {
    const result = await generate(config({ archetypes: [], count: 3 }));

    expect(result.context.state.landmassLayout).toEqual({ structures: [], shelves: [] });
  });

  it('requires a valid world mask', async () => {
    const pipeline = new MapGenerator<MapConfig, MapState>([new LandmassLayoutStage()]);

    await expect(pipeline.generate(base, {})).rejects.toMatchObject({
      cause: { message: expect.stringContaining('worldMask') },
    });
  });

  it('rejects invalid configuration', async () => {
    const cases: ReadonlyArray<Partial<MapConfig['landmasses']>> = [
      { count: 0 },
      { count: MAX_LANDMASSES + 1 },
      { size: 0.1 },
      { diversity: 2 },
      { archetypes: ['spiral' as LandmassArchetype] },
      { shelf: { ...DEFAULT_LANDMASS_CONFIG.shelf, falloff: 2 } },
      { shelf: { ...DEFAULT_LANDMASS_CONFIG.shelf, width: 0 } },
    ];

    for (const overrides of cases) {
      await expect(generate(config(overrides))).rejects.toMatchObject({
        cause: { name: 'RangeError' },
      });
    }
  });
});
