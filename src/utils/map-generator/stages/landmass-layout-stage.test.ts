import { DEFAULT_LANDMASS_CONFIG, MAX_LANDMASSES } from './landmass-defaults';
import { LandmassLayoutStage } from './landmass-layout-stage';
import { createLandmassSampler } from './landmass-sampler';
import { containsWorld } from '../../world-shape';
import { MapGenerator } from '../pipeline';
import type { LandmassArchetype, LandmassLayout, MapConfig, MapState } from '../types';

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

  it('anchors every structure inside the world with finite geometry', async () => {
    const result = await generate(config({ count: MAX_LANDMASSES, size: 1 }));
    const layout = landmassLayout(result);

    for (const landmass of layout.landmasses) {
      for (const point of landmass.spine) {
        expect(Number.isFinite(point.x)).toBe(true);
        expect(Number.isFinite(point.y)).toBe(true);
      }
      for (const shape of [...landmass.positiveShapes, ...landmass.negativeShapes]) {
        expect(Number.isFinite(shape.center.x)).toBe(true);
        expect(Number.isFinite(shape.center.y)).toBe(true);
      }
      const xs = landmass.spine.map(point => point.x);
      const ys = landmass.spine.map(point => point.y);
      const centre = {
        x: (Math.min(...xs) + Math.max(...xs)) / 2,
        y: (Math.min(...ys) + Math.max(...ys)) / 2,
      };
      expect(containsWorld('disc', 2 * centre.x - 1, 2 * centre.y - 1)).toBe(true);
    }
  });

  it('is deterministic per seed and changes with it', async () => {
    const first = await generate();
    const second = await generate();
    const other = await generate({ ...base, world: { ...base.world, seed: 18 } });

    expect(second.context.state.landmassLayout).toEqual(first.context.state.landmassLayout);
    expect(other.context.state.landmassLayout).not.toEqual(first.context.state.landmassLayout);
  });

  it('reports the structures, shelves and size', async () => {
    const result = await generate(config({ count: 3 }));

    expect(result.statistics[0].details).toMatchObject({
      structures: 3,
      shelves: expect.any(Number),
      bytes: 16,
    });
  });

  it('measures land coverage from the id map, not from analytic areas', async () => {
    const size = 32;
    const result = await generate(largeConfig(), size * size);
    const idMap = landmassIdMap(result);
    let landCells = 0;
    for (const value of idMap) {
      if (value > 0) {
        landCells++;
      }
    }

    expect(result.statistics[0].details?.landCoverage).toBeCloseTo(landCells / (size * size), 10);
  });

  it('reports zero coverage for an empty world mask', async () => {
    const size = 32;
    const result = await generate(largeConfig(), size * size, new Uint8Array(size * size));

    expect(result.statistics[0].details?.landCoverage).toBe(0);
    expect(landmassIdMap(result).every(value => value === 0)).toBe(true);
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

  it('lets structures reach the coast instead of clustering in the middle', async () => {
    const size = 48;
    const source: MapConfig = {
      ...base,
      world: {
        ...base.world,
        dimensions: { widthMeters: 2, heightMeters: 2, sampleWidth: size, sampleHeight: size },
      },
    };
    const worldMask = new Uint8Array(size * size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const inside = containsWorld('disc', 2 * (x / (size - 1)) - 1, 2 * (y / (size - 1)) - 1);
        worldMask[y * size + x] = inside ? 1 : 0;
      }
    }
    const result = await generate(source, size * size, worldMask);
    const idMap = landmassIdMap(result);
    let outerLand = 0;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (idMap[y * size + x] === 0) {
          continue;
        }
        const radius = Math.hypot(2 * (x / (size - 1)) - 1, 2 * (y / (size - 1)) - 1);
        if (radius > 0.7) {
          outerLand++;
        }
      }
    }
    expect(outerLand).toBeGreaterThan(0);
  });

  it('handles a crowded world without leaving the mask', async () => {
    const size = 32;
    const source: MapConfig = {
      ...base,
      world: {
        ...base.world,
        dimensions: { widthMeters: 2, heightMeters: 2, sampleWidth: size, sampleHeight: size },
      },
      landmasses: { ...DEFAULT_LANDMASS_CONFIG, count: MAX_LANDMASSES, size: 1 },
    };
    const worldMask = new Uint8Array(size * size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const inside = containsWorld('disc', 2 * (x / (size - 1)) - 1, 2 * (y / (size - 1)) - 1);
        worldMask[y * size + x] = inside ? 1 : 0;
      }
    }
    const result = await generate(source, size * size, worldMask);
    const idMap = landmassIdMap(result);
    let landCells = 0;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (worldMask[y * size + x] === 0) {
          expect(idMap[y * size + x]).toBe(0);
          continue;
        }
        if (idMap[y * size + x] > 0) {
          landCells++;
        }
      }
    }
    expect(landCells).toBeGreaterThan(0);
  });

  it('leaves cells outside the world mask empty', async () => {
    const size = 32;
    const full = await generate(largeConfig(), size * size);
    const landmassAt = createLandmassSampler(landmassLayout(full).landmasses);
    let leftLand = 0;
    let rightLand = 0;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (landmassAt(x / 31, y / 31) > 0) {
          if (x < size / 2) {
            leftLand++;
          } else {
            rightLand++;
          }
        }
      }
    }
    // Mask the half without land, so the test proves masking really matters.
    const keepRight = rightLand >= leftLand;
    const mask = new Uint8Array(size * size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (x >= size / 2 === keepRight) {
          mask[y * size + x] = 1;
        }
      }
    }
    const result = await generate(largeConfig(), size * size, mask);
    const idMap = landmassIdMap(result);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (mask[y * size + x] === 0) {
          expect(idMap[y * size + x]).toBe(0);
        }
      }
    }
    expect(Math.max(leftLand, rightLand)).toBeGreaterThan(0);
    expect(idMap.some(value => value > 0)).toBe(true);
  });

  it('draws no structures for an explicitly empty archetype pool', async () => {
    const result = await generate(config({ archetypes: [], count: 3 }));
    const layout = landmassLayout(result);

    expect(layout.landmasses).toHaveLength(0);
    expect(layout.shelves).toHaveLength(0);
    expect(landmassIdMap(result).every(value => value === 0)).toBe(true);
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
