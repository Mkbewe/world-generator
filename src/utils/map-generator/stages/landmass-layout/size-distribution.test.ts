import {
  measureWorldArea,
  planSizes,
  type SizePlan,
  type StructureSize,
} from './size-distribution';
import { SeededRandom } from '../../random/seeded-random';
import type { LandmassConfig } from '../../types';
import { DEFAULT_LANDMASS_CONFIG } from '../landmass-defaults';

/** Unit geometries the plan sees: a footprint area and its longest side. */
const UNITS: readonly StructureSize[] = [
  { area: 0.2, extent: 0.5 },
  { area: 0.24, extent: 0.6 },
  { area: 0.18, extent: 0.4 },
  { area: 0.22, extent: 0.55 },
];

function config(overrides: Partial<LandmassConfig> = {}): LandmassConfig {
  return { ...DEFAULT_LANDMASS_CONFIG, ...overrides };
}

/** Total footprint area a plan produces for the given unit geometries. */
function totalArea(plan: SizePlan, units: readonly StructureSize[]): number {
  return plan.scales.reduce((total, scale, index) => total + units[index].area * scale * scale, 0);
}

describe('planSizes', () => {
  it('spends the influence budget and orders the structures largest first', () => {
    const plan = planSizes(UNITS, config(), 0.8, new SeededRandom(5));
    const areas = plan.order.map(
      index => UNITS[index].area * plan.scales[index] * plan.scales[index]
    );

    expect(plan.scales).toHaveLength(UNITS.length);
    expect(plan.scales.every(scale => scale > 0)).toBe(true);
    expect(totalArea(plan, UNITS)).toBeCloseTo(0.8 * 0.25 * config().size, 10);
    expect(areas).toEqual([...areas].sort((left, right) => right - left));
  });

  it('spreads the sizes more with a higher diversity', () => {
    const even = planSizes(UNITS, config({ diversity: 0 }), 0.8, new SeededRandom(5));
    const varied = planSizes(UNITS, config({ diversity: 1 }), 0.8, new SeededRandom(5));
    const spread = (plan: SizePlan): number => Math.max(...plan.scales) / Math.min(...plan.scales);

    expect(spread(varied)).toBeGreaterThan(spread(even));
  });

  it('grows the budget with the size setting', () => {
    const small = planSizes(UNITS, config({ size: 0.25 }), 0.8, new SeededRandom(5));
    const big = planSizes(UNITS, config({ size: 1 }), 0.8, new SeededRandom(5));

    expect(totalArea(big, UNITS)).toBeGreaterThan(totalArea(small, UNITS));
  });

  it('keeps a thin structure from stretching across the world', () => {
    const thin: readonly StructureSize[] = [{ area: 0.05, extent: 2 }];
    const plan = planSizes(thin, config(), 1, new SeededRandom(5));

    expect(plan.scales[0] * thin[0].extent).toBeLessThanOrEqual(0.6);
  });
});

describe('measureWorldArea', () => {
  it('measures the share of the mask inside the world', () => {
    expect(measureWorldArea(new Uint8Array([1, 1, 0, 0]))).toBe(0.5);
    expect(measureWorldArea(new Uint8Array([1, 1]))).toBe(1);
    expect(measureWorldArea(new Uint8Array(0))).toBe(0);
  });
});
