import type { WorldSampler } from './collision';
import { containsWorld, type WorldShape } from '../../../world-shape';
import { createWorldSpace } from '../../space';

/**
 * Sampler over the generated world mask. The mask is the placement truth, so
 * later irregular worlds need no change here.
 */
export function createMaskSampler(
  worldMask: Uint8Array,
  width: number,
  height: number
): WorldSampler {
  const space = createWorldSpace({ sampleWidth: width, sampleHeight: height });

  return point => {
    // Points outside the map are outside the world, never on its edge.
    if (point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) {
      return false;
    }
    const cell = space.normalizedToCell(point.x, point.y);
    return worldMask[cell.y * width + cell.x] === 1;
  };
}

/** Analytic sampler of a world shape; the mask above is generated from it. */
export function createShapeSampler(shape: WorldShape): WorldSampler {
  return point => containsWorld(shape, 2 * point.x - 1, 2 * point.y - 1);
}
