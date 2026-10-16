import { createHeightmapNoiseBands } from './bands';
import {
  BORDER_GATE_METERS,
  BORDER_GATE_WARP_SHARE,
  DEFAULT_HEIGHTMAP_CONFIG,
  OCEAN_FLOOR_METERS,
} from './defaults';
import { buildHeightField } from './field';
import type { WorldDimensions } from '../../../world-dimensions';
import { containsNormalized } from '../../../world-shape';
import { RandomFactory } from '../../random';
import { createWorldSpace } from '../../space';
import type {
  GeologicalRegionPlan,
  GeologicalRegionType,
  GeologyPlan,
  HeightmapConfig,
  RegionTerrainConfig,
} from '../../types';

const DIMENSIONS: WorldDimensions = {
  widthMeters: 4000,
  heightMeters: 2000,
  sampleWidth: 64,
  sampleHeight: 32,
};

/** Dense grid for the islets: a 62.5 m cell cannot hold the shallow shelf ring. */
const FINE_DIMENSIONS: WorldDimensions = {
  widthMeters: 4000,
  heightMeters: 2000,
  sampleWidth: 256,
  sampleHeight: 128,
};

/** The real app samples at 4 m; this raster matches that density closely. */
const DETAIL_DIMENSIONS: WorldDimensions = {
  widthMeters: 4000,
  heightMeters: 2000,
  sampleWidth: 1024,
  sampleHeight: 512,
};

const CELLS = DIMENSIONS.sampleWidth * DIMENSIONS.sampleHeight;

function region(index: number, type: GeologicalRegionType): GeologicalRegionPlan {
  return {
    id: `region-${index + 1}`,
    type,
    centre: { x: (index + 0.5) / 2, y: 0.5 },
    weight: 1,
    areaSquareMeters: DIMENSIONS.widthMeters * DIMENSIONS.heightMeters,
  };
}

/** One region's terrain overrides; the rest falls back to neutral values. */
function terrain(overrides: Partial<RegionTerrainConfig> = {}): RegionTerrainConfig {
  return {
    landShare: 0.5,
    concentration: 0.5,
    clustering: 0.35,
    age: 0.5,
    mountainousness: 0.6,
    ringShare: 0,
    ...overrides,
  };
}

/** One-region plans use a far border; two-region plans split the world in half. */
function plan(
  regions: readonly GeologicalRegionPlan[],
  worldMask?: Uint8Array,
  dimensions: WorldDimensions = DIMENSIONS
): GeologyPlan {
  const cells = dimensions.sampleWidth * dimensions.sampleHeight;
  const cellMeters = dimensions.widthMeters / dimensions.sampleWidth;
  const mask = worldMask ?? new Uint8Array(cells).fill(1);
  const owner = new Int16Array(cells);
  const border = new Float32Array(cells);
  const twoRegions = regions.length === 2;
  for (let y = 0; y < dimensions.sampleHeight; y++) {
    for (let x = 0; x < dimensions.sampleWidth; x++) {
      const index = y * dimensions.sampleWidth + x;
      if (mask[index] === 0) {
        owner[index] = -1;
        continue;
      }
      if (twoRegions) {
        const left = x < dimensions.sampleWidth / 2;
        owner[index] = left ? 0 : 1;
        const offset = left ? dimensions.sampleWidth / 2 - 1 - x : x - dimensions.sampleWidth / 2;
        border[index] = offset * cellMeters + cellMeters / 2;
      } else {
        owner[index] = 0;
        border[index] = 5000;
      }
    }
  }
  return {
    regions,
    regionRasterSize: { width: dimensions.sampleWidth, height: dimensions.sampleHeight },
    regionOwnerMap: owner,
    regionBorderDistanceMap: border,
    worldAreaSquareMeters: dimensions.widthMeters * dimensions.heightMeters,
  };
}

/** Every region gets its own noise families, exactly like the stage builds them. */
function regionBandsFor(source: GeologyPlan, dimensions: WorldDimensions = DIMENSIONS) {
  return source.regions.map(region =>
    createHeightmapNoiseBands(new RandomFactory(17), dimensions, `heightmap.${region.id}`)
  );
}

function build(
  source: GeologyPlan,
  mask?: Uint8Array,
  config: Partial<HeightmapConfig> = {},
  dimensions: WorldDimensions = DIMENSIONS
): Float32Array {
  const worldMask =
    mask ?? new Uint8Array(dimensions.sampleWidth * dimensions.sampleHeight).fill(1);
  return buildHeightField({
    plan: source,
    bands: createHeightmapNoiseBands(new RandomFactory(17), dimensions),
    regionBands: regionBandsFor(source, dimensions),
    random: new RandomFactory(17),
    worldMask,
    dimensions,
    space: createWorldSpace(dimensions),
    config: { ...DEFAULT_HEIGHTMAP_CONFIG, ...config },
  }).heightmap;
}

/** Cells above the waterline; the raster stores 0 at the sea level. */
function countLand(heightmap: Float32Array): number {
  let land = 0;
  for (const value of heightmap) {
    if (value > 0) {
      land++;
    }
  }
  return land;
}

function maxHeight(heightmap: Float32Array): number {
  let max = 0;
  for (const value of heightmap) {
    max = Math.max(max, value);
  }
  return max;
}

describe('buildHeightField', () => {
  const single = plan([region(0, 'ordinary')]);

  it('is deterministic for one seed and configuration', () => {
    expect(build(single)).toEqual(build(single));
  });

  it('keeps every height finite and fills provenance', () => {
    const mask = new Uint8Array(CELLS).fill(1);
    mask[0] = 0;
    const two = plan([region(0, 'ordinary'), region(1, 'volcanic')], mask);
    const field = buildHeightField({
      plan: two,
      bands: createHeightmapNoiseBands(new RandomFactory(17), DIMENSIONS),
      regionBands: regionBandsFor(two),
      random: new RandomFactory(17),
      worldMask: mask,
      dimensions: DIMENSIONS,
      space: createWorldSpace(DIMENSIONS),
      config: DEFAULT_HEIGHTMAP_CONFIG,
    });

    for (const value of field.heightmap) {
      expect(Number.isFinite(value)).toBe(true);
    }
    expect(field.provenanceMap[0]).toBe(-1);
    expect(field.provenanceMap[1]).toBe(0);
    expect(field.provenanceMap[field.provenanceMap.length - 1]).toBe(1);
  });

  it('never digs below the shared ocean floor', () => {
    const heightmap = build(single, undefined, { isletFrequency: 0 });
    const floor = -OCEAN_FLOOR_METERS;
    let deepest = Infinity;

    for (const value of heightmap) {
      expect(value).toBeGreaterThanOrEqual(floor);
      deepest = Math.min(deepest, value);
    }
    // The seabed is a real terrain, not a shallow shelf: it reaches well
    // below the -20 m waterline at its deepest.
    expect(deepest).toBeLessThanOrEqual(-20);
  });

  it('never raises land inside the raw border margin', () => {
    const mask = new Uint8Array(CELLS).fill(1);
    const two = plan([region(0, 'ordinary'), region(1, 'ordinary')], mask);
    const heightmap = build(two, mask);
    const rawMargin = BORDER_GATE_METERS * (1 - BORDER_GATE_WARP_SHARE);

    for (let index = 0; index < heightmap.length; index++) {
      if (two.regionBorderDistanceMap[index] < rawMargin) {
        expect(heightmap[index]).toBeLessThanOrEqual(0);
      }
    }
  });

  it('keeps land away from the world mask edge', () => {
    const space = createWorldSpace(FINE_DIMENSIONS);
    const cells = FINE_DIMENSIONS.sampleWidth * FINE_DIMENSIONS.sampleHeight;
    const mask = new Uint8Array(cells);
    for (let y = 0; y < FINE_DIMENSIONS.sampleHeight; y++) {
      for (let x = 0; x < FINE_DIMENSIONS.sampleWidth; x++) {
        if (containsNormalized('disc', space.cellToNormalized(x, y))) {
          mask[y * FINE_DIMENSIONS.sampleWidth + x] = 1;
        }
      }
    }
    const heightmap = build(
      plan([region(0, 'ordinary')], mask, FINE_DIMENSIONS),
      mask,
      { isletFrequency: 0 },
      FINE_DIMENSIONS
    );
    const rawMargin = BORDER_GATE_METERS * (1 - BORDER_GATE_WARP_SHARE);
    const window = 4;

    for (let y = 0; y < FINE_DIMENSIONS.sampleHeight; y++) {
      for (let x = 0; x < FINE_DIMENSIONS.sampleWidth; x++) {
        const index = y * FINE_DIMENSIONS.sampleWidth + x;
        if (mask[index] === 0) {
          continue;
        }
        let nearest = Infinity;
        for (let dy = -window; dy <= window; dy++) {
          for (let dx = -window; dx <= window; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (
              nx < 0 ||
              ny < 0 ||
              nx >= FINE_DIMENSIONS.sampleWidth ||
              ny >= FINE_DIMENSIONS.sampleHeight ||
              mask[ny * FINE_DIMENSIONS.sampleWidth + nx] !== 0
            ) {
              continue;
            }
            nearest = Math.min(
              nearest,
              space.distanceMeters(space.cellToNormalized(x, y), space.cellToNormalized(nx, ny))
            );
          }
        }
        if (nearest < rawMargin) {
          expect(heightmap[index], `cell ${x},${y}`).toBeLessThanOrEqual(0);
        }
      }
    }
  });

  it('drops a sheer coast straight into the water', () => {
    const heightmap = build(
      plan([region(0, 'ordinary')], undefined, FINE_DIMENSIONS),
      undefined,
      { isletFrequency: 0 },
      FINE_DIMENSIONS
    );
    let tallest = 0;
    for (const value of heightmap) {
      tallest = Math.max(tallest, value);
    }
    let wall = false;
    for (let y = 1; y < FINE_DIMENSIONS.sampleHeight - 1 && !wall; y++) {
      for (let x = 1; x < FINE_DIMENSIONS.sampleWidth - 1; x++) {
        const index = y * FINE_DIMENSIONS.sampleWidth + x;
        const value = heightmap[index] ?? 0;
        if (value < tallest * 0.3) {
          continue;
        }
        const neighbours = [
          index - 1,
          index + 1,
          index - FINE_DIMENSIONS.sampleWidth,
          index + FINE_DIMENSIONS.sampleWidth,
        ];
        // The summit shore reaches the waterline as a wall: a land cell tall
        // enough to be a real cliff, directly beside open water.
        if (neighbours.some(neighbour => (heightmap[neighbour] ?? 0) <= 0)) {
          wall = true;
          break;
        }
      }
    }
    expect(wall).toBe(true);
  });

  it('raises more land with the land-share tendency', () => {
    const low = build(plan([region(0, 'ordinary')]), undefined, {
      isletFrequency: 0,
      regions: [terrain({ landShare: 0.2 })],
    });
    const high = build(plan([region(0, 'ordinary')]), undefined, {
      isletFrequency: 0,
      regions: [terrain({ landShare: 0.8 })],
    });

    expect(countLand(high)).toBeGreaterThan(countLand(low));
  });

  it('grows land for scattered and focused concentrations', () => {
    for (const concentration of [0.1, 0.9]) {
      const heightmap = build(plan([region(0, 'ordinary')]), undefined, {
        isletFrequency: 0,
        regions: [terrain({ concentration })],
      });

      expect(countLand(heightmap)).toBeGreaterThan(0);
    }
  });

  it('raises the peaks with the relief', () => {
    const low = build(single, undefined, { relief: 0.2 });
    const high = build(single, undefined, { relief: 0.9 });

    expect(maxHeight(high)).toBeGreaterThan(maxHeight(low));
  });

  it('keeps volcanic peaks far above the flat lagoons', () => {
    const volcanic = build(plan([region(0, 'volcanic')]));
    const lagoon = build(plan([region(0, 'lagoon')]));

    expect(maxHeight(volcanic)).toBeGreaterThan(maxHeight(lagoon) * 2);
  });

  it('keeps lagoons low and flat', () => {
    const ordinary = build(plan([region(0, 'ordinary')]));
    const lagoon = build(plan([region(0, 'lagoon')]));

    expect(maxHeight(lagoon)).toBeLessThan(maxHeight(ordinary) * 0.5);
  });

  it('shapes lagoon regions into reef rings around shallow water', () => {
    const heightmap = build(
      plan([region(0, 'lagoon')], undefined, FINE_DIMENSIONS),
      undefined,
      {},
      FINE_DIMENSIONS
    );
    let shallowWater = 0;

    for (const value of heightmap) {
      if (value < 0 && value > -20) {
        shallowWater++;
      }
    }

    expect(countLand(heightmap)).toBeGreaterThan(0);
    expect(shallowWater).toBeGreaterThan(0);
    // Sandy atolls and motu islets stay a few metres above the waterline.
    expect(maxHeight(heightmap)).toBeLessThan(15);
  });

  it('cuts fjord regions with submerged coastal channels', () => {
    const heightmap = build(
      plan([region(0, 'fjord')], undefined, FINE_DIMENSIONS),
      undefined,
      {},
      FINE_DIMENSIONS
    );
    let channels = 0;

    for (let y = 1; y < FINE_DIMENSIONS.sampleHeight - 1; y++) {
      for (let x = 1; x < FINE_DIMENSIONS.sampleWidth - 1; x++) {
        const index = y * FINE_DIMENSIONS.sampleWidth + x;
        const value = heightmap[index] ?? 0;
        if (value >= -1 || value <= -18) {
          continue;
        }
        const left = heightmap[index - 1] ?? 0;
        const right = heightmap[index + 1] ?? 0;
        const up = heightmap[index - FINE_DIMENSIONS.sampleWidth] ?? 0;
        const down = heightmap[index + FINE_DIMENSIONS.sampleWidth] ?? 0;
        if ((left > 0 && right > 0) || (up > 0 && down > 0)) {
          channels++;
        }
      }
    }

    expect(countLand(heightmap)).toBeGreaterThan(0);
    expect(maxHeight(heightmap)).toBeGreaterThan(100);
    expect(channels).toBeGreaterThan(0);
  });

  it('adds more emergencies with the islet frequency', () => {
    // The islet shelf is a few cells wide only; a dense raster gives the
    // feature room to show, like the real 4 m sampling does.
    const source = plan([region(0, 'ordinary')], undefined, DETAIL_DIMENSIONS);
    const none = build(source, undefined, { isletFrequency: 0 }, DETAIL_DIMENSIONS);
    const many = build(source, undefined, { isletFrequency: 1 }, DETAIL_DIMENSIONS);

    expect(countLand(many)).toBeGreaterThan(countLand(none));
  });
});
