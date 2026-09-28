import { HEIGHTMAP_BANDS, type HeightmapBand } from './defaults';
import type { WorldDimensions } from '../../../world-dimensions';
import { createWorldNoiseBand, type RandomFactory } from '../../random';
import type { WorldPoint } from '../../types';

/** The heightmap's own noise in the -1..1 range the port returns. */
export interface HeightmapNoiseBands {
  readonly large: (point: WorldPoint) => number;
  readonly medium: (point: WorldPoint) => number;
  readonly fine: (point: WorldPoint) => number;
}

/**
 * Builds the three bands from the heightmap's own named streams.
 *
 * Measured with `bands.bench.ts`: three procedural bands sample ~12.6M points
 * in ~0.71 s at 2048² (about 17M samples/s), so the reference grid needs no
 * per-band rasters. Revisit buffering only for grids far beyond that (GEO-09).
 */
export function createHeightmapNoiseBands(
  random: RandomFactory,
  dimensions: WorldDimensions
): HeightmapNoiseBands {
  return {
    large: signedBand(random, 'heightmap.large', dimensions, HEIGHTMAP_BANDS.large),
    medium: signedBand(random, 'heightmap.medium', dimensions, HEIGHTMAP_BANDS.medium),
    fine: signedBand(random, 'heightmap.fine', dimensions, HEIGHTMAP_BANDS.fine),
  };
}

/** One band straight from the port, in its native -1..1 range. */
function signedBand(
  random: RandomFactory,
  namespace: string,
  dimensions: WorldDimensions,
  band: HeightmapBand
): (point: WorldPoint) => number {
  return createWorldNoiseBand(random, namespace, dimensions, band);
}
