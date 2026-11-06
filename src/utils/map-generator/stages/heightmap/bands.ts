import { HEIGHTMAP_BANDS, type HeightmapBand } from './defaults';
import type { WorldDimensions } from '../../../world-dimensions';
import { NoiseSource, type RandomFactory, type WorldNoiseReader } from '../../random';
import type { WorldPoint } from '../../types';

/** The heightmap's own noise in the -1..1 range the port returns. */
export interface HeightmapNoiseBands {
  readonly large: (point: WorldPoint) => number;
  readonly warpX: (point: WorldPoint) => number;
  readonly warpY: (point: WorldPoint) => number;
  readonly coast: (point: WorldPoint) => number;
  readonly ridge: (point: WorldPoint) => number;
  readonly fine: (point: WorldPoint) => number;
  readonly bank: (point: WorldPoint) => number;
}

/**
 * Builds the standard bands from one named stream family. The world
 * background and the border gate use the default family; every region gets
 * its own, so two regions never repeat the same shapes.
 */
export function createHeightmapNoiseBands(
  random: RandomFactory,
  dimensions: WorldDimensions,
  namespace = 'heightmap'
): HeightmapNoiseBands {
  return {
    large: createHeightmapBand(random, dimensions, `${namespace}.large`, HEIGHTMAP_BANDS.large),
    warpX: createHeightmapBand(random, dimensions, `${namespace}.warpX`, HEIGHTMAP_BANDS.warpX),
    warpY: createHeightmapBand(random, dimensions, `${namespace}.warpY`, HEIGHTMAP_BANDS.warpY),
    coast: createHeightmapBand(random, dimensions, `${namespace}.coast`, HEIGHTMAP_BANDS.coast),
    ridge: createHeightmapBand(random, dimensions, `${namespace}.ridge`, HEIGHTMAP_BANDS.ridge),
    fine: createHeightmapBand(random, dimensions, `${namespace}.fine`, HEIGHTMAP_BANDS.fine),
    bank: createHeightmapBand(random, dimensions, `${namespace}.bank`, HEIGHTMAP_BANDS.bank),
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
