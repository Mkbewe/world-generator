import type { WorldDimensions } from '../../../../world-dimensions';
import type { SeededRandom } from '../../../random/seeded-random';
import type { LandmassConfig } from '../../../types';

/** Longest side a structure may reach, as a fraction of the world. */
const MAX_EXTENT = 0.4;

/** Single structure never exceeds this multiple of the typical size. */
const MAX_TYPICAL_MULTIPLE = 3;

/** Smallest longest side in meters, so diversity never shrinks a speck. */
const MIN_EXTENT_METERS = 10;

/** World side the size scale is calibrated against, in meters. */
export const SIZE_REFERENCE_METERS = 2000;

/** Typical island extent at the slider ends, as a share of the reference world. */
const MIN_SIZE_FRACTION = 0.026;
const MAX_SIZE_FRACTION = 0.169;

/** Bounds of the weak world-size scaling, so toy worlds stay bounded. */
const MIN_WORLD_SCALE = 0.5;
const MAX_WORLD_SCALE = 2;

/** Weight spread at the strongest diversity. */
const MAX_SIGMA = 0.6;

/** Weight spread at the lowest diversity; structures still differ a little. */
const MIN_SIGMA = 0.15;

/** Unit geometry of one structure, as the size plan sees it. */
export interface StructureSize {
  /** Longest side of the unit geometry's influence bounds. */
  readonly extent: number;
  /** Multiplier of the typical extent from the structure's recipe; 1 is standard. */
  readonly sizeFactor?: number;
  /** Hard cap of the longest side as a fraction of the world; the global cap by default. */
  readonly maxExtent?: number;
}

export interface SizePlan {
  /** Scale factor per structure, in the input order. */
  readonly scales: readonly number[];
  /** Structure indices, largest influence first. */
  readonly order: readonly number[];
}

/** Typical island extent for a size-scale value, as a world share at the reference. */
export function sizeFraction(size: number): number {
  const placed = Math.min(1, Math.max(0, size));
  return MIN_SIZE_FRACTION + placed * (MAX_SIZE_FRACTION - MIN_SIZE_FRACTION);
}

/**
 * Plans the physical size: the small-to-large scale and the log-normal
 * weights set a target extent per structure. Islands grow with the world,
 * but only with its square root, so doubling the world never doubles them.
 * Sizing by extent keeps a compact and a slender shape equally readable, and
 * a thinner corridor really renders thinner instead of growing longer.
 */
export function planSizes(
  structures: readonly StructureSize[],
  config: LandmassConfig,
  random: SeededRandom,
  dimensions: WorldDimensions
): SizePlan {
  const reference = Math.max(1, Math.min(dimensions.widthMeters, dimensions.heightMeters));
  const worldScale = Math.min(
    MAX_WORLD_SCALE,
    Math.max(MIN_WORLD_SCALE, Math.sqrt(SIZE_REFERENCE_METERS / reference))
  );
  const typical = sizeFraction(config.size) * worldScale;
  const sigma = MIN_SIGMA + config.diversity * (MAX_SIGMA - MIN_SIGMA);
  const weights = structures.map(() => Math.exp(sigma * gaussian(random)));
  const mean = weights.reduce((sum, weight) => sum + weight, 0) / Math.max(1, weights.length);
  const scales = structures.map((structure, index) => {
    const extent = Math.max(structure.extent, Number.EPSILON);
    const own = typical * (structure.sizeFactor ?? 1);
    const target = mean > 0 ? cappedTarget(own * weights[index], own, mean) : own;
    const longest = structure.maxExtent ?? MAX_EXTENT;
    return clamp(target / extent, MIN_EXTENT_METERS / reference / extent, longest / extent);
  });
  const order = structures
    .map((_, index) => index)
    .sort(
      (left, right) =>
        scales[right] * structures[right].extent - scales[left] * structures[left].extent
    );

  return { scales, order };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** A single weight never drags a structure past a multiple of the typical size. */
function cappedTarget(raw: number, typical: number, mean: number): number {
  return Math.min(raw, MAX_TYPICAL_MULTIPLE * typical) / mean;
}

/** Standard normal sample from two uniforms (Box-Muller). */
function gaussian(random: SeededRandom): number {
  const u = Math.max(Number.EPSILON, random.next());
  const v = random.next();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
