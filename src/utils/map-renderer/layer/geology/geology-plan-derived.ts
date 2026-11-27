import type { GeologyPlan, WorldPoint } from '@generator/types';

import { regionCentres } from './geology-labels';
import { yieldToBrowser } from './geology-yield';
import type { MapSize } from '../layer';
import { regionBorderSegments } from '../region-preview/region-preview-border';
import { extendRegionOwners } from '../region-preview/region-preview-raster';

/** The plan stores physical metres; the painter works in raster cells. */
const BORDER_DISTANCE_OFFSET_CELLS = 0.5;

/** Data every geology frame needs, derived once per plan and raster size. */
export interface GeologyPlanDerived {
  readonly extendedOwners: Int16Array;
  readonly distances: Float32Array;
  readonly borders: Float64Array;
  readonly centres: readonly (WorldPoint | undefined)[];
}

/**
 * Reuses the plan's physical border distances instead of running a second
 * distance transform on the main thread. The generator measures metres from a
 * border cell to its foreign neighbour; the painter measures cells from the
 * cell centre to the border line, hence the half-cell offset.
 */
export function planBorderDistances(plan: GeologyPlan): Float32Array {
  const { width, height } = plan.regionRasterSize;
  const owners = plan.regionOwnerMap;
  let ownedCells = 0;
  for (const owner of owners) {
    if (owner >= 0) {
      ownedCells++;
    }
  }
  if (ownedCells === 0 || plan.worldAreaSquareMeters <= 0) {
    throw new RangeError('A geology plan needs at least one owned cell with a positive area.');
  }
  const cellMeters = Math.sqrt(plan.worldAreaSquareMeters / ownedCells);
  const farDistance = width + height;
  const distances = new Float32Array(owners.length);
  for (let index = 0; index < owners.length; index++) {
    const owner = owners[index] ?? -1;
    distances[index] =
      owner < 0
        ? farDistance
        : (plan.regionBorderDistanceMap[index] ?? 0) / cellMeters + BORDER_DISTANCE_OFFSET_CELLS;
  }
  return distances;
}

/**
 * Derives the rasters in the same order the layer paints them. The browser
 * gets a turn between blocks so generation progress and input stay responsive.
 */
export async function deriveGeologyPlan(
  plan: GeologyPlan,
  size: MapSize,
  signal: AbortSignal
): Promise<GeologyPlanDerived> {
  signal.throwIfAborted();
  const { width, height } = plan.regionRasterSize;
  const extendedOwners = extendRegionOwners(plan.regionOwnerMap, width, height);
  signal.throwIfAborted();
  await yieldToBrowser();

  const distances = planBorderDistances(plan);
  signal.throwIfAborted();
  await yieldToBrowser();

  const borders = regionBorderSegments(extendedOwners, width, height, size);
  signal.throwIfAborted();
  await yieldToBrowser();

  const centres = regionCentres(extendedOwners, width, height);
  signal.throwIfAborted();

  return { extendedOwners, distances, borders, centres };
}
