import { planSizes, sizeFraction, type SizePlan, type StructureSize } from './size-plan';
import type { WorldDimensions } from '../../../../world-dimensions';
import { SeededRandom } from '../../../random/seeded-random';
import type { LandmassConfig } from '../../../types';
import { DEFAULT_LANDMASS_CONFIG } from '../defaults';

/** Unit geometries the plan sees: the longest side of the influence bounds. */
const UNITS: readonly StructureSize[] = [
  { extent: 0.6 },
  { extent: 0.7 },
  { extent: 0.5 },
  { extent: 0.55 },
];

/** Two-kilometer world: only its meters matter to the size plan. */
const DIMENSIONS: WorldDimensions = {
  widthMeters: 2000,
  heightMeters: 2000,
  sampleWidth: 2,
  sampleHeight: 2,
};

function config(overrides: Partial<LandmassConfig> = {}): LandmassConfig {
  return { ...DEFAULT_LANDMASS_CONFIG, ...overrides };
}

/** Longest side every plan produces, in the input order. */
function extents(plan: SizePlan, units: readonly StructureSize[]): number[] {
  return plan.scales.map((scale, index) => units[index].extent * scale);
}

/** Extents in meters on the given world. */
function meters(
  plan: SizePlan,
  units: readonly StructureSize[],
  dimensions: WorldDimensions
): number[] {
  return extents(plan, units).map(extent => extent * dimensions.widthMeters);
}

describe('planSizes', () => {
  it('plans the typical extent and orders the structures largest first', () => {
    const plan = planSizes(UNITS, config(), new SeededRandom(5), DIMENSIONS);
    const sizes = extents(plan, UNITS);

    expect(plan.scales).toHaveLength(UNITS.length);
    expect(plan.scales.every(scale => scale > 0)).toBe(true);
    for (const extent of sizes) {
      expect(extent).toBeGreaterThanOrEqual(10 / DIMENSIONS.widthMeters);
      expect(extent).toBeLessThanOrEqual(0.6);
    }
    const ordered = plan.order.map(index => sizes[index]);
    expect(ordered).toEqual([...ordered].sort((left, right) => right - left));
  });

  it('spreads the sizes more with a higher diversity', () => {
    const even = planSizes(UNITS, config({ diversity: 0 }), new SeededRandom(5), DIMENSIONS);
    const varied = planSizes(UNITS, config({ diversity: 1 }), new SeededRandom(5), DIMENSIONS);
    const spread = (plan: SizePlan): number => Math.max(...plan.scales) / Math.min(...plan.scales);

    expect(spread(varied)).toBeGreaterThan(spread(even));
  });

  it('grows the extents with the size setting', () => {
    const small = planSizes(UNITS, config({ size: 0.2 }), new SeededRandom(5), DIMENSIONS);
    const big = planSizes(UNITS, config({ size: 0.8 }), new SeededRandom(5), DIMENSIONS);
    const mean = (plan: SizePlan): number =>
      extents(plan, UNITS).reduce((sum, extent) => sum + extent, 0) / UNITS.length;

    expect(mean(big)).toBeGreaterThan(mean(small));
  });

  it('grows islands slower than the world', () => {
    // A four-times wider world halves the typical share, so islands in meters
    // only double instead of quadrupling.
    const bigWorld: WorldDimensions = {
      widthMeters: 8000,
      heightMeters: 8000,
      sampleWidth: 4,
      sampleHeight: 4,
    };
    const small = meters(
      planSizes(UNITS, config(), new SeededRandom(5), DIMENSIONS),
      UNITS,
      DIMENSIONS
    );
    const big = meters(planSizes(UNITS, config(), new SeededRandom(5), bigWorld), UNITS, bigWorld);

    expect(big).toHaveLength(small.length);
    for (const [index, size] of small.entries()) {
      expect(big[index]).toBeCloseTo(2 * size, 8);
    }
  });

  it('gives a compact and a slender unit comparable extents', () => {
    const shapes: readonly StructureSize[] = [
      { extent: 0.9 },
      { extent: 1.9 },
      { extent: 1.4 },
      { extent: 0.7 },
    ];
    const plan = planSizes(shapes, config({ diversity: 0 }), new SeededRandom(5), DIMENSIONS);
    const sizes = extents(plan, shapes);

    // The plan sizes by extent, so the shape itself no longer decides the scale.
    expect(Math.max(...sizes) / Math.min(...sizes)).toBeLessThan(2);
  });

  it('keeps a thin structure from stretching across the world', () => {
    const thin: readonly StructureSize[] = [{ extent: 2 }];
    const plan = planSizes(thin, config(), new SeededRandom(5), DIMENSIONS);

    expect(plan.scales[0] * thin[0].extent).toBeLessThanOrEqual(0.4);
  });

  it('shrinks one intent through its size factor', () => {
    const mixed: readonly StructureSize[] = UNITS.map((unit, index) =>
      index === 1 ? { ...unit, sizeFactor: 0.5 } : unit
    );
    const full = planSizes(UNITS, config({ diversity: 0 }), new SeededRandom(5), DIMENSIONS);
    const plan = planSizes(mixed, config({ diversity: 0 }), new SeededRandom(5), DIMENSIONS);
    const fullSizes = extents(full, UNITS);
    const sizes = extents(plan, mixed);

    expect(sizes[0]).toBeCloseTo(fullSizes[0], 10);
    expect(sizes[1]).toBeCloseTo(fullSizes[1] * 0.5, 10);
    const ordered = plan.order.map(index => sizes[index]);
    expect(ordered).toEqual([...ordered].sort((left, right) => right - left));
  });

  it('caps one intent below the global longest side', () => {
    const capped: readonly StructureSize[] = UNITS.map((unit, index) =>
      index === 2 ? { ...unit, maxExtent: 0.3 } : unit
    );
    // The largest scale on a tiny world drives the targets into their caps.
    const tiny: WorldDimensions = {
      widthMeters: 250,
      heightMeters: 250,
      sampleWidth: 4,
      sampleHeight: 4,
    };
    const settings = config({ size: 1, diversity: 1 });
    const full = planSizes(UNITS, settings, new SeededRandom(12), tiny);
    const plan = planSizes(capped, settings, new SeededRandom(12), tiny);
    const fullSizes = extents(full, UNITS);
    const sizes = extents(plan, capped);

    expect(fullSizes[2]).toBeGreaterThan(0.3);
    expect(sizes[2]).toBeCloseTo(0.3, 10);
    expect(sizes[0]).toBeCloseTo(fullSizes[0], 10);
  });

  it('caps single structures at a multiple of the typical size', () => {
    const plan = planSizes(UNITS, config({ diversity: 1 }), new SeededRandom(5), DIMENSIONS);
    const sizes = meters(plan, UNITS, DIMENSIONS);

    expect(Math.max(...sizes)).toBeLessThanOrEqual(
      3 * sizeFraction(DEFAULT_LANDMASS_CONFIG.size) * DIMENSIONS.widthMeters
    );
  });
});
