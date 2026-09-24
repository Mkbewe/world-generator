import type { SeededRandom } from '../../random/seeded-random';
import type { LandmassConfig } from '../../types';

/** Longest side a structure reaches at the largest size with a median weight. */
const TYPICAL_EXTENT = 0.5;

/** Longest side a structure may reach, as a fraction of the world. */
const MAX_EXTENT = 0.6;

/** Smallest longest side, so the diversity never shrinks a structure to a speck. */
const MIN_EXTENT = 0.1;

/** Weight spread at the strongest diversity. */
const MAX_SIGMA = 1;

/** Weight spread at the lowest diversity; structures still differ a little. */
const MIN_SIGMA = 0.15;

/** Unit geometry of one structure, as the size plan sees it. */
export interface StructureSize {
  /** Longest side of the unit geometry's influence bounds. */
  readonly extent: number;
}

export interface SizePlan {
  /** Scale factor per structure, in the input order. */
  readonly scales: readonly number[];
  /** Structure indices, largest influence first. */
  readonly order: readonly number[];
}

/**
 * Plans the visual size: the typical scale and the log-normal weights set a
 * target extent per structure, and every unit geometry is scaled to reach it.
 * Sizing by extent keeps a compact and a slender shape equally readable, and a
 * thinner corridor really renders thinner instead of growing longer.
 */
export function planSizes(
  structures: readonly StructureSize[],
  config: LandmassConfig,
  random: SeededRandom
): SizePlan {
  const typical = TYPICAL_EXTENT * config.size;
  const sigma = MIN_SIGMA + config.diversity * (MAX_SIGMA - MIN_SIGMA);
  const weights = structures.map(() => Math.exp(sigma * gaussian(random)));
  const mean = weights.reduce((sum, weight) => sum + weight, 0) / Math.max(1, weights.length);
  const scales = structures.map((structure, index) => {
    const extent = Math.max(structure.extent, Number.EPSILON);
    const target = mean > 0 ? (typical * weights[index]) / mean : typical;
    return clamp(target / extent, MIN_EXTENT / extent, MAX_EXTENT / extent);
  });
  const order = structures
    .map((_, index) => index)
    .sort((left, right) => weights[right] - weights[left]);

  return { scales, order };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Standard normal sample from two uniforms (Box-Muller). */
function gaussian(random: SeededRandom): number {
  const u = Math.max(Number.EPSILON, random.next());
  const v = random.next();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
