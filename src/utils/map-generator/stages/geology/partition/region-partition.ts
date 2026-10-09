import { fitRegionBiases } from './partition-bias';
import { growRegions } from './partition-growth';
import type { RegionPartition, RegionPartitionInput } from './partition-types';
import { createBorderWarp, sampleWarp } from './partition-warp';
import { gridDistanceTransform } from '../../../../grid-distance';
import type { WorldDimensions } from '../../../../world-dimensions';
import { containsNormalized } from '../../../../world-shape';
import { GenerationCancelledError } from '../../../errors';
import { checkPartition } from '../validation/partition-check';

export type { RegionPartition, RegionPartitionInput } from './partition-types';

/** Progress slices of the partition: fit, growth, consistency check, distances. */
const FIT_PROGRESS = 0.1;
const GROW_PROGRESS = 0.88;
const CHECK_PROGRESS = 0.95;

/**
 * Deformed watershed partition: a shared seeded noise shifts the sampled
 * coordinate, and a priority queue claims every mask cell from the frontier of
 * the region with the lowest squared distance minus its fitted bias. Every
 * claimed cell touches its region, so each region is one 4-connected body by
 * construction — there is no smoothing or island merging after rasterisation.
 * The biases are fitted on a sampled lattice so the rasterised shares follow
 * the configured region sizes; the result is deterministic for one seed and
 * configuration.
 */
export function createRegionPartition(input: RegionPartitionInput): RegionPartition {
  const { dimensions, shape, space, regions } = input;
  const width = dimensions.sampleWidth;
  const height = dimensions.sampleHeight;
  const mask = new Uint8Array(width * height);
  let worldCells = 0;

  for (let y = 0; y < height; y++) {
    if (input.signal?.aborted) {
      throw new GenerationCancelledError();
    }
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      if (containsNormalized(shape, space.cellToNormalized(x, y))) {
        mask[index] = 1;
        worldCells++;
      }
    }
  }

  const warp = createBorderWarp(input);
  const report = input.report;
  const biases = fitRegionBiases(input, mask, warp, worldCells, fraction =>
    report?.(fraction * FIT_PROGRESS)
  );
  const grown = growRegions(input, mask, sampleWarp(input, warp, 1), biases, 1, {
    signal: input.signal,
    worldCells,
    report: fraction => report?.(FIT_PROGRESS + fraction * (GROW_PROGRESS - FIT_PROGRESS)),
  });
  const counts = checkPartition({
    owner: grown.owner,
    mask,
    width,
    height,
    regionCount: regions.length,
    signal: input.signal,
    report: fraction => report?.(GROW_PROGRESS + fraction * (CHECK_PROGRESS - GROW_PROGRESS)),
  });
  return {
    owner: grown.owner,
    counts,
    borderDistanceMeters: regionBorderDistances(grown.owner, dimensions, fraction =>
      report?.(CHECK_PROGRESS + fraction * (1 - CHECK_PROGRESS))
    ),
  };
}

/** Distance from each region cell to another region, in metres. */
export function regionBorderDistances(
  owner: Int16Array,
  dimensions: WorldDimensions,
  report?: (progress: number) => void
): Float32Array {
  const stepX = dimensions.widthMeters / dimensions.sampleWidth;
  const stepY = dimensions.heightMeters / dimensions.sampleHeight;
  report?.(0);
  const distances = gridDistanceTransform(owner, dimensions.sampleWidth, dimensions.sampleHeight, {
    borderDistance: 0,
    farDistance: Math.hypot(dimensions.widthMeters, dimensions.heightMeters),
    stepX,
    stepY,
    diagonal: Math.hypot(stepX, stepY),
  });
  report?.(1);
  return distances;
}
