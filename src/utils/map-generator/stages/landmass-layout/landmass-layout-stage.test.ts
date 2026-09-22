import { LandmassLayoutStage } from './landmass-layout-stage';
import { estimateArea } from './topology';
import { validateLayout } from './validation';
import { MapGenerator } from '../../pipeline';
import type { LandmassArchetype, MapConfig, MapState } from '../../types';
import { DEFAULT_LANDMASS_CONFIG, MAX_LANDMASSES } from '../landmass-defaults';

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
    // The mask is full, so the world area is 1 and the budget is predictable.
    const targetArea = 0.4 * DEFAULT_LANDMASS_CONFIG.size;

    for (const seed of Array.from({ length: 25 }, (_, index) => index + 1)) {
      const source = { ...base, world: { ...base.world, seed } };
      const result = await generate(source);
      const layout = result.context.state.landmassLayout;
      expect(layout).toBeDefined();
      if (!layout) {
        continue;
      }

      expect(() => validateLayout(layout)).not.toThrow();
      const areas = layout.structures.map(structure =>
        estimateArea(structure.nodes, structure.edges)
      );
      expect(areas.reduce((sum, area) => sum + area, 0)).toBeCloseTo(targetArea, 8);
      expect(Math.max(...areas) / Math.min(...areas)).toBeGreaterThan(1.1);
      expect((await generate(source)).context.state.landmassLayout).toEqual(layout);
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
      cause: { message: expect.stringContaining('world mask') },
    });
  });

  it('rejects invalid configuration', async () => {
    const cases: ReadonlyArray<Partial<MapConfig['landmasses']>> = [
      { count: 0 },
      { count: MAX_LANDMASSES + 1 },
      { size: 0.1 },
      { diversity: 2 },
      { archetypes: ['spiral' as LandmassArchetype] },
      { irregularity: 2 },
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
