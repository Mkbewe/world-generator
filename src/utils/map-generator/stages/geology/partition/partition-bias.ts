import { growRegions } from './partition-growth';
import type { RegionPartitionInput } from './partition-types';
import { sampleWarp } from './partition-warp';
import type { WorldPoint } from '../../../types';

/** Sampled cells used to fit the region biases before the full-resolution pass. */
const FIT_SAMPLES = 10_000;
/** The fit stops once every share is this close to its configured target. */
const FIT_TOLERANCE = 0.01;
/** Bisection steps per region; the share is monotone in the bias. */
const FIT_BISECTION_STEPS = 14;
/** Sweeps over all regions; a second one absorbs the coupling between biases. */
const FIT_SWEEPS = 2;
/** Below this many cells per region the fit cannot express the targets. */
const MIN_CELLS_PER_REGION_FOR_FIT = 8;

/**
 * Fits one bias per region so the shares approach the configured sizes. The
 * fit grows regions on a sampled lattice, which keeps it cheap at any raster
 * size; the full-resolution pass then uses the fitted biases.
 */
export function fitRegionBiases(
  input: RegionPartitionInput,
  mask: Uint8Array,
  warp: ((point: WorldPoint) => WorldPoint) | undefined,
  worldCells: number,
  report?: (progress: number) => void
): Float64Array {
  const count = input.regions.length;
  const biases = new Float64Array(count);
  if (count < 2 || worldCells < count * MIN_CELLS_PER_REGION_FOR_FIT) {
    report?.(1);
    return biases;
  }
  const { dimensions } = input;
  const width = dimensions.sampleWidth;
  const height = dimensions.sampleHeight;
  const stride = Math.max(1, Math.round(Math.sqrt((width * height) / FIT_SAMPLES)));
  const samples = sampleWarp(input, warp, stride);
  const range = dimensions.widthMeters ** 2 + dimensions.heightMeters ** 2;
  const totalWeight = input.regions.reduce((sum, region) => sum + region.weight, 0) || 1;
  const targets = input.regions.map(region => region.weight / totalWeight);

  /** Grown shares of one candidate bias set, with the worst target error. */
  const measure = (): { shares: Float64Array; worst: number } => {
    const counts = growRegions(input, mask, samples, biases, stride, {
      signal: input.signal,
    }).counts;
    let sampled = 0;
    for (const count_ of counts) {
      sampled += count_;
    }
    const shares = new Float64Array(count);
    let worst = 0;
    if (sampled > 0) {
      for (let region = 0; region < count; region++) {
        const share = (counts[region] ?? 0) / sampled;
        shares[region] = share;
        worst = Math.max(worst, Math.abs(share - (targets[region] ?? 0)));
      }
    }
    return { shares, worst };
  };

  for (let sweep = 0; sweep < FIT_SWEEPS; sweep++) {
    for (let region = 0; region < count; region++) {
      if (measure().worst <= FIT_TOLERANCE) {
        report?.(1);
        return biases;
      }
      // The share grows monotonically with the bias, so bisection lands in the
      // target window even where the response jumps.
      let low = (biases[region] ?? 0) - range;
      let high = (biases[region] ?? 0) + range;
      for (let step = 0; step < FIT_BISECTION_STEPS; step++) {
        const middle = (low + high) / 2;
        biases[region] = middle;
        const share = measure().shares[region] ?? 0;
        if (share < (targets[region] ?? 0)) {
          low = middle;
        } else {
          high = middle;
        }
      }
      biases[region] = (low + high) / 2;
    }
    report?.((sweep + 1) / FIT_SWEEPS);
  }
  return biases;
}
