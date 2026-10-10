import { createNoise2D } from 'simplex-noise';

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

/** One selection point shared by the worker and the preview renderer. */
export function createRegionDisplacement(seed: number): RegionDisplacement {
  const random = new RandomFactory(seed).create('macro-region');
  const displacementX = createNoise2D(() => random.next());
  const displacementY = createNoise2D(() => random.next());

  return {
    at: (x, y) => {
      const shiftX = fbm(displacementX, x * 3, y * 3);
      const shiftY = fbm(displacementY, x * 3, y * 3);
      return {
        ringRadius(center, amplitude) {
          return planarDistance({ x: x + shiftX * amplitude, y: y + shiftY * amplitude }, center);
        },
        bandPosition(axis, amplitude) {
          return axis === 'x' ? x + shiftX * amplitude : y + shiftY * amplitude;
        },
      };
    },
  };
}

function fbm(noise: (x: number, y: number) => number, x: number, y: number): number {
  const first = noise(x, y);
  const second = noise(x * 2, y * 2) * 0.5;
  return (first + second) / 1.5;
}
