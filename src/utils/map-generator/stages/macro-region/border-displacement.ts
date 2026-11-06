import { createDisplacementField, type DisplacementOffsets } from '../../irregularity';
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
  const field = createDisplacementField(new RandomFactory(seed), 'macro-region');
  const offset: DisplacementOffsets = { x: 0, y: 0 };

  return {
    at: (x, y) => {
      field(x, y, offset);
      const offsetX = offset.x;
      const offsetY = offset.y;
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
