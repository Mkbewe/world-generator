import { DEFAULT_LANDMASS_CONFIG, MAX_LANDMASSES } from './landmass-defaults';
import { LandmassLayoutStage } from './landmass-layout-stage';
import { containsWorld } from '../../world-shape';
import { MapGenerator } from '../pipeline';
import type { MapConfig, MapState } from '../types';

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
  const worldMask = new Uint8Array(16).fill(1);
  return new MapGenerator<MapConfig, MapState>([new LandmassLayoutStage()]).generate(source, {
    worldMask,
  });
}

describe('LandmassLayoutStage', () => {
  it('builds the configured structures with resolving shelves', async () => {
    const result = await generate();
    const layout = result.context.state.landmassLayout!;

    expect(layout.landmasses).toHaveLength(DEFAULT_LANDMASS_CONFIG.count);
    expect(layout.shelves.length).toBeGreaterThanOrEqual(1);
    expect(new Set(layout.landmasses.map(landmass => landmass.id)).size).toBe(
      layout.landmasses.length
    );
    for (const landmass of layout.landmasses) {
      expect(landmass.spine.length).toBeGreaterThanOrEqual(2);
      expect(landmass.widthProfile).toHaveLength(landmass.spine.length);
      expect(landmass.widthProfile.every(width => width > 0)).toBe(true);
      expect(layout.shelves.some(shelf => shelf.id === landmass.shelfId)).toBe(true);
    }
  });

  it('keeps the generated geometry inside the world shape', async () => {
    const result = await generate(config({ count: MAX_LANDMASSES, scale: 1.6 }));
    const layout = result.context.state.landmassLayout!;

    for (const landmass of layout.landmasses) {
      for (const point of landmass.spine) {
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThanOrEqual(1);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeLessThanOrEqual(1);
        expect(containsWorld('disc', 2 * point.x - 1, 2 * point.y - 1)).toBe(true);
      }
      for (const shape of [...landmass.positiveShapes, ...landmass.negativeShapes]) {
        expect(containsWorld('disc', 2 * shape.center.x - 1, 2 * shape.center.y - 1)).toBe(true);
      }
    }
  });

  it('is deterministic per seed and changes with it', async () => {
    const first = await generate();
    const second = await generate();
    const other = await generate({ ...base, world: { ...base.world, seed: 18 } });

    expect(second.context.state.landmassLayout).toEqual(first.context.state.landmassLayout);
    expect(other.context.state.landmassLayout).not.toEqual(first.context.state.landmassLayout);
  });

  it('reports the structures, shelves and coverage', async () => {
    const result = await generate(config({ count: 3 }));

    expect(result.statistics[0].details).toMatchObject({
      structures: 3,
      shelves: expect.any(Number),
    });
    const { coverage } = result.statistics[0].details ?? {};
    expect(coverage).toBeGreaterThan(0);
    expect(coverage).toBeLessThanOrEqual(1);
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
      { scale: 0.1 },
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
