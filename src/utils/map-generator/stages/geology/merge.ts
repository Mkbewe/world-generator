/** One area's signed contribution at a point, in metres. */
export interface FieldContribution {
  readonly areaId: string;
  /** Positive lifts the seabed, negative deepens it, in metres. */
  readonly heightMeters: number;
}

/**
 * Height of the signed quadratic union of overlapping contributions. Lifts and
 * depressions union separately, so the result is commutative and bounded:
 *
 * - one contribution keeps its exact value,
 * - `n` equal lifts reach `sqrt(n)` of a single value, never `n`,
 * - the result stays within `[-sqrt(sum of depressions²), +sqrt(sum of lifts²)]`.
 *
 * The field accumulates the squared sums per cell and calls this once, so the
 * raster carries the same single operator the list form below uses.
 */
export function unionHeight(liftSquared: number, dropSquared: number): number {
  return Math.sqrt(liftSquared) - Math.sqrt(dropSquared);
}

/**
 * Merges overlapping contributions into one signed height delta, in metres.
 *
 * Numeric example: two lifts of `100 m` give `141.421 m`, three lifts give
 * `173.205 m`, and a lift of `100 m` with a depression of `60 m` gives `40 m`.
 */
export function mergeContributions(contributions: readonly FieldContribution[]): number {
  let lifts = 0;
  let depressions = 0;
  for (const contribution of contributions) {
    const value = contribution.heightMeters;
    if (value > 0) {
      lifts += value * value;
    } else if (value < 0) {
      depressions += value * value;
    }
  }
  return unionHeight(lifts, depressions);
}

/**
 * Area id carrying the strongest contribution at a point; a zero height does
 * not contribute. Ties break on the smallest id, so the diagnostic provenance
 * never depends on the config list order. Returns `undefined` when nothing
 * contributes.
 */
export function dominantAreaId(contributions: readonly FieldContribution[]): string | undefined {
  let selected: FieldContribution | undefined;
  for (const contribution of contributions) {
    if (contribution.heightMeters === 0) {
      continue;
    }
    if (!selected || isStronger(contribution, selected)) {
      selected = contribution;
    }
  }
  return selected?.areaId;
}

function isStronger(candidate: FieldContribution, current: FieldContribution): boolean {
  const strength = Math.abs(candidate.heightMeters);
  const best = Math.abs(current.heightMeters);
  if (strength > best) {
    return true;
  }
  return strength === best && candidate.areaId < current.areaId;
}
