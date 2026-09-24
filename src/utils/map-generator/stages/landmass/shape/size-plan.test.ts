import { planSizes, type SizePlan, type StructureSize } from './size-plan';
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

function config(overrides: Partial<LandmassConfig> = {}): LandmassConfig {
  return { ...DEFAULT_LANDMASS_CONFIG, ...overrides };
}

/** Longest side every plan produces, in the input order. */
function extents(plan: SizePlan, units: readonly StructureSize[]): number[] {
  return plan.scales.map((scale, index) => units[index].extent * scale);
}

describe('planSizes', () => {
  it('plans the typical extent and orders the structures largest first', () => {
    const plan = planSizes(UNITS, config(), new SeededRandom(5));
    const sizes = extents(plan, UNITS);

    expect(plan.scales).toHaveLength(UNITS.length);
    expect(plan.scales.every(scale => scale > 0)).toBe(true);
    for (const extent of sizes) {
      expect(extent).toBeGreaterThanOrEqual(0.1);
      expect(extent).toBeLessThanOrEqual(0.6);
    }
    const ordered = plan.order.map(index => sizes[index]);
    expect(ordered).toEqual([...ordered].sort((left, right) => right - left));
  });

  it('spreads the sizes more with a higher diversity', () => {
    const even = planSizes(UNITS, config({ diversity: 0 }), new SeededRandom(5));
    const varied = planSizes(UNITS, config({ diversity: 1 }), new SeededRandom(5));
    const spread = (plan: SizePlan): number => Math.max(...plan.scales) / Math.min(...plan.scales);

    expect(spread(varied)).toBeGreaterThan(spread(even));
  });

  it('grows the extents with the size setting', () => {
    const small = planSizes(UNITS, config({ size: 0.25 }), new SeededRandom(5));
    const big = planSizes(UNITS, config({ size: 1 }), new SeededRandom(5));
    const mean = (plan: SizePlan): number =>
      extents(plan, UNITS).reduce((sum, extent) => sum + extent, 0) / UNITS.length;

    expect(mean(big)).toBeGreaterThan(mean(small));
  });

  it('gives a compact and a slender unit comparable extents', () => {
    const shapes: readonly StructureSize[] = [
      { extent: 0.9 },
      { extent: 1.9 },
      { extent: 1.4 },
      { extent: 0.7 },
    ];
    const plan = planSizes(shapes, config({ diversity: 0 }), new SeededRandom(5));
    const sizes = extents(plan, shapes);

    // The plan sizes by extent, so the shape itself no longer decides the scale.
    expect(Math.max(...sizes) / Math.min(...sizes)).toBeLessThan(2);
  });

  it('keeps a thin structure from stretching across the world', () => {
    const thin: readonly StructureSize[] = [{ extent: 2 }];
    const plan = planSizes(thin, config(), new SeededRandom(5));

    expect(plan.scales[0] * thin[0].extent).toBeLessThanOrEqual(0.6);
  });
});
