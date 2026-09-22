import { DEFAULT_LANDMASS_CONFIG, MAX_LANDMASSES } from './landmass-defaults';
import { LandmassLayoutStage } from './landmass-layout-stage';
import { createLandmassSampler } from './landmass-sampler';
import { containsWorld } from '../../world-shape';
import { MapGenerator } from '../pipeline';
import type { LandmassLayout, MapConfig, MapState } from '../types';

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

async function generate(source: MapConfig = base, cells = 16, mask?: Uint8Array) {
  const worldMask = mask ?? new Uint8Array(cells).fill(1);
  return new MapGenerator<MapConfig, MapState>([new LandmassLayoutStage()]).generate(source, {
    worldMask,
  });
}

function largeConfig(): MapConfig {
  return {
    ...base,
    world: {
      ...base.world,
      dimensions: { widthMeters: 2, heightMeters: 2, sampleWidth: 32, sampleHeight: 32 },
    },
  };
}

function landmassLayout(result: Awaited<ReturnType<typeof generate>>): LandmassLayout {
  const layout = result.context.state.landmassLayout;
  if (!layout) {
    throw new Error('Expected a generated landmass layout.');
  }
  return layout;
}

function landmassIdMap(result: Awaited<ReturnType<typeof generate>>): Uint8Array {
  const idMap = result.context.state.landmassIdMap;
  if (!idMap) {
    throw new Error('Expected a generated landmass id map.');
  }
  return idMap;
}

describe('LandmassLayoutStage', () => {
  it('builds the configured structures with resolving shelves', async () => {
    const result = await generate();
    const layout = landmassLayout(result);

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
    const layout = landmassLayout(result);

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

  it('reports the structures, shelves, coverage and size', async () => {
    const result = await generate(config({ count: 3 }));

    expect(result.statistics[0].details).toMatchObject({
      structures: 3,
      shelves: expect.any(Number),
      bytes: 16,
    });
    const { coverage } = result.statistics[0].details ?? {};
    expect(coverage).toBeGreaterThan(0);
    expect(coverage).toBeLessThanOrEqual(1);
  });

  it('fills the id map from the shared sampler', async () => {
    const result = await generate(largeConfig(), 32 * 32);
    const layout = landmassLayout(result);
    const idMap = landmassIdMap(result);
    const landmassAt = createLandmassSampler(layout.landmasses);

    expect(idMap).toHaveLength(32 * 32);
    let landCells = 0;
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const expected = landmassAt(x / 31, y / 31);
        expect(idMap[y * 32 + x]).toBe(expected);
        if (expected > 0) {
          landCells++;
        }
      }
    }
    expect(landCells).toBeGreaterThan(0);
    expect(Math.max(...idMap)).toBeLessThanOrEqual(DEFAULT_LANDMASS_CONFIG.count);
  });

  it('leaves cells outside the world mask empty', async () => {
    const size = 32;
    const mask = new Uint8Array(size * size);
    for (let y = 0; y < size; y++) {
      for (let x = size / 2; x < size; x++) {
        mask[y * size + x] = 1;
      }
    }
    const result = await generate(largeConfig(), size * size, mask);
    const layout = landmassLayout(result);
    const idMap = landmassIdMap(result);
    const landmassAt = createLandmassSampler(layout.landmasses);
    let wouldBeLand = 0;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size / 2; x++) {
        expect(idMap[y * size + x]).toBe(0);
        if (landmassAt(x / 31, y / 31) > 0) {
          wouldBeLand++;
        }
      }
    }
    expect(wouldBeLand).toBeGreaterThan(0);
    expect(idMap.some(value => value > 0)).toBe(true);
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
