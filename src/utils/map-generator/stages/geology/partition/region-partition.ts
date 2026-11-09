import { GenerationCancelledError } from '@generator/errors';

import { fitRegionBiases } from './partition-bias';
import { growRegions } from './partition-growth';
import type { RegionPartition, RegionPartitionInput } from './partition-types';
import { createBorderWarp, sampleWarp } from './partition-warp';
import { gridDistanceTransform } from '../../../../grid-distance';
import type { WorldDimensions } from '../../../../world-dimensions';
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
  const { dimensions, worldMask, regions } = input;
  const width = dimensions.sampleWidth;
  const height = dimensions.sampleHeight;
  const cells = width * height;
  if (worldMask.length !== cells) {
    throw new Error('The world mask must match the partition raster size.');
  }

  let worldCells = 0;
  for (let index = 0; index < cells; index++) {
    if (input.signal?.aborted) {
      throw new GenerationCancelledError();
    }
    if (worldMask[index] === 1) {
      worldCells++;
    }
  }

  const warp = createBorderWarp(input);
  const report = input.report;
  const biases = fitRegionBiases(input, worldMask, warp, worldCells, fraction =>
    report?.(fraction * FIT_PROGRESS)
  );
  const grown = growRegions(input, worldMask, sampleWarp(input, warp, 1), biases, 1, {
    signal: input.signal,
    worldCells,
    report: fraction => report?.(FIT_PROGRESS + fraction * (GROW_PROGRESS - FIT_PROGRESS)),
  });
  const counts = checkPartition({
    owner: grown.owner,
    mask: worldMask,
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
