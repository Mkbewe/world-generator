import { NoiseSource } from '../../random';
import { RandomFactory } from '../../random/random-factory';
import { planarDistance } from '../../space';
import type { MacroRegionPoint } from '../../types';

/**
 * Applies the border deformation at normalized map coordinates. The field
 * shifts the sampled point, so every region below reads one probe per cell.
 *
 * The field is probed once per cell via `at`: the returned cell object
 * reuses that probe for every region, so deformation costs one field sample
 * per cell no matter how many regions read it.
 */
export interface RegionDisplacement {
  at(x: number, y: number): CellDeformation;
}

/** Deformation of one probed cell, applied per region and amplitude. */
export interface CellDeformation {
  /** Shifted ring radius around `center`. */
  ringRadius(center: MacroRegionPoint, amplitude: number): number;
  /** Shifted band position on `axis`. */
  bandPosition(axis: 'x' | 'y', amplitude: number): number;
}

/** Two octaves at three base cycles across the normalized world. */
const REGION_NOISE_SPEC = {
  frequency: 3,
  octaves: 2,
  persistence: 0.5,
  lacunarity: 2,
} as const;

/** One selection point shared by the worker and the preview renderer. */
export function createRegionDisplacement(seed: number): RegionDisplacement {
  const noise = new NoiseSource(new RandomFactory(seed), 'macro-region');
  const shiftX = noise.scalar(REGION_NOISE_SPEC, 'x');
  const shiftY = noise.scalar(REGION_NOISE_SPEC, 'y');

  return {
    at: (x, y) => {
      const offsetX = shiftX(x, y);
      const offsetY = shiftY(x, y);
      return {
        ringRadius(center, amplitude) {
          return planarDistance({ x: x + offsetX * amplitude, y: y + offsetY * amplitude }, center);
        },
        bandPosition(axis, amplitude) {
          return axis === 'x' ? x + offsetX * amplitude : y + offsetY * amplitude;
        },
      };
    },
  };
}
