import type { WorldSampler } from './collision';
import { containsWorld, type WorldShape } from '../../../world-shape';

/**
 * Sampler over the generated world mask. The mask is the placement truth, so
 * later irregular worlds need no change here.
 */
export function createMaskSampler(
  worldMask: Uint8Array,
  width: number,
  height: number
): WorldSampler {
  const xDivisor = Math.max(1, width - 1);
  const yDivisor = Math.max(1, height - 1);

  return point => {
    // Points outside the map are outside the world, never on its edge.
    if (point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) {
      return false;
    }
    const x = Math.min(width - 1, Math.max(0, Math.round(point.x * xDivisor)));
    const y = Math.min(height - 1, Math.max(0, Math.round(point.y * yDivisor)));
    return worldMask[y * width + x] === 1;
  };
}

/** Analytic sampler of a world shape; the mask above is generated from it. */
export function createShapeSampler(shape: WorldShape): WorldSampler {
  return point => containsWorld(shape, 2 * point.x - 1, 2 * point.y - 1);
}
