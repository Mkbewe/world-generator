import type { SeededRandom } from '../../random/seeded-random';
import type { LandmassConfig } from '../../types';

/** Share of the world area the structures influence together at the largest size. */
const MAX_TARGET_SHARE = 0.4;

/** Weight spread at the strongest diversity. */
const MAX_SIGMA = 1;

/** Weight spread at the lowest diversity; structures still differ a little. */
const MIN_SIGMA = 0.15;

export interface SizePlan {
  /** Scale factor per structure, in the input order. */
  readonly scales: readonly number[];
  /** Structure indices, largest influence first. */
  readonly order: readonly number[];
}

/** Share of the world mask that lies inside the world shape. */
export function measureWorldArea(worldMask: Uint8Array): number {
  let inside = 0;
  for (const cell of worldMask) {
    if (cell !== 0) {
      inside++;
    }
  }
  return worldMask.length === 0 ? 0 : inside / worldMask.length;
}

/**
 * Plans the influence budget: the world area and the typical scale set the total
 * target area, log-normal weights spread it over the structures, and every unit
 * geometry is scaled so its estimated area matches its share.
 */
export function planSizes(
  areas: readonly number[],
  config: LandmassConfig,
  worldArea: number,
  random: SeededRandom
): SizePlan {
  const targetArea = worldArea * MAX_TARGET_SHARE * config.size;
  const sigma = MIN_SIGMA + config.diversity * (MAX_SIGMA - MIN_SIGMA);
  const weights = areas.map(() => Math.exp(sigma * gaussian(random)));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const shares = weights.map(weight => (total > 0 ? weight / total : 0));
  const scales = areas.map((area, index) =>
    Math.sqrt((targetArea * shares[index]) / Math.max(area, Number.EPSILON))
  );
  const order = areas.map((_, index) => index).sort((left, right) => shares[right] - shares[left]);

  return { scales, order };
}

/** Standard normal sample from two uniforms (Box-Muller). */
function gaussian(random: SeededRandom): number {
  const u = Math.max(Number.EPSILON, random.next());
  const v = random.next();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
