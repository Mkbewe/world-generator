import { HEIGHTMAP_BANDS, type HeightmapBand } from './defaults';
import type { WorldDimensions } from '../../../world-dimensions';
import { NoiseSource, type RandomFactory, type WorldNoiseReader } from '../../random';
import type { WorldPoint } from '../../types';

/** The heightmap's own noise in the -1..1 range the port returns. */
export interface HeightmapNoiseBands {
  readonly large: (point: WorldPoint) => number;
  readonly medium: (point: WorldPoint) => number;
  readonly fine: (point: WorldPoint) => number;
}

/**
 * Builds the three standard bands from one named stream family. The world
 * background and the border gate use the default family; every region gets
 * its own, so two regions never repeat the same shapes.
 */
export function createHeightmapNoiseBands(
  random: RandomFactory,
  dimensions: WorldDimensions,
  namespace = 'heightmap'
): HeightmapNoiseBands {
  return {
    large: signedBand(random, `${namespace}.large`, dimensions, HEIGHTMAP_BANDS.large),
    medium: signedBand(random, `${namespace}.medium`, dimensions, HEIGHTMAP_BANDS.medium),
    fine: signedBand(random, `${namespace}.fine`, dimensions, HEIGHTMAP_BANDS.fine),
  };
}

/** One band from the noise port with a custom spec, in the -1..1 range. */
export function createHeightmapBand(
  random: RandomFactory,
  dimensions: WorldDimensions,
  namespace: string,
  spec: HeightmapBand
): WorldNoiseReader {
  return new NoiseSource(random, namespace).band(dimensions, spec);
}

/** One band straight from the noise port, in its native -1..1 range. */
function signedBand(
  random: RandomFactory,
  namespace: string,
  dimensions: WorldDimensions,
  band: HeightmapBand
): WorldNoiseReader {
  return createHeightmapBand(random, dimensions, namespace, band);
}
