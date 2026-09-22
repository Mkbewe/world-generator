import { measureWorldArea, planSizes, type SizePlan } from './size-distribution';
import { SeededRandom } from '../../random/seeded-random';
import type { LandmassConfig } from '../../types';
import { DEFAULT_LANDMASS_CONFIG } from '../landmass-defaults';

const AREAS = [0.2, 0.24, 0.18, 0.22];

function config(overrides: Partial<LandmassConfig> = {}): LandmassConfig {
  return { ...DEFAULT_LANDMASS_CONFIG, ...overrides };
}

/** Total footprint area a plan produces for the given unit areas. */
function totalArea(plan: SizePlan, areas: readonly number[]): number {
  return plan.scales.reduce((total, scale, index) => total + areas[index] * scale * scale, 0);
}

describe('planSizes', () => {
  it('spends the influence budget and orders the structures largest first', () => {
    const plan = planSizes(AREAS, config(), 0.8, new SeededRandom(5));
    const areas = plan.order.map(index => AREAS[index] * plan.scales[index] * plan.scales[index]);

    expect(plan.scales).toHaveLength(AREAS.length);
    expect(plan.scales.every(scale => scale > 0)).toBe(true);
    expect(totalArea(plan, AREAS)).toBeCloseTo(0.8 * 0.4 * config().size, 10);
    expect(areas).toEqual([...areas].sort((left, right) => right - left));
  });

  it('spreads the sizes more with a higher diversity', () => {
    const even = planSizes(AREAS, config({ diversity: 0 }), 0.8, new SeededRandom(5));
    const varied = planSizes(AREAS, config({ diversity: 1 }), 0.8, new SeededRandom(5));
    const spread = (plan: SizePlan): number => Math.max(...plan.scales) / Math.min(...plan.scales);

    expect(spread(varied)).toBeGreaterThan(spread(even));
  });

  it('grows the budget with the size setting', () => {
    const small = planSizes(AREAS, config({ size: 0.25 }), 0.8, new SeededRandom(5));
    const big = planSizes(AREAS, config({ size: 1 }), 0.8, new SeededRandom(5));

    expect(totalArea(big, AREAS)).toBeGreaterThan(totalArea(small, AREAS));
  });
});

describe('measureWorldArea', () => {
  it('measures the share of the mask inside the world', () => {
    expect(measureWorldArea(new Uint8Array([1, 1, 0, 0]))).toBe(0.5);
    expect(measureWorldArea(new Uint8Array([1, 1]))).toBe(1);
    expect(measureWorldArea(new Uint8Array(0))).toBe(0);
  });
});
