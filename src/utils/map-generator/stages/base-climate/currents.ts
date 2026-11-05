import type { OceanCurrentConfig, OceanCurrentFlow, WorldPoint } from '../../types';

export type OceanCurrentDistance = (left: WorldPoint, right: WorldPoint) => number;

/** Flow direction and vector magnitude at one normalized point. */
export interface OceanCurrentSample {
  /** Clockwise angle from +x in the map frame, 0..2π. */
  angle: number;
  /** Summed vector magnitude, clamped to 0..1. */
  strength: number;
}

interface Vector {
  x: number;
  y: number;
}

type FlowDirection = (dx: number, dy: number, distance: number, out: Vector) => void;

const FLOW_DIRECTIONS: Readonly<Record<OceanCurrentFlow, FlowDirection>> = {
  clockwise(dx, dy, distance, out) {
    out.x = -dy / distance;
    out.y = dx / distance;
  },
  counterclockwise(dx, dy, distance, out) {
    out.x = dy / distance;
    out.y = -dx / distance;
  },
  outward(dx, dy, distance, out) {
    out.x = dx / distance;
    out.y = dy / distance;
  },
  inward(dx, dy, distance, out) {
    out.x = -dx / distance;
    out.y = -dy / distance;
  },
};

const TWO_PI = Math.PI * 2;

/**
 * Builds the static current field sampler. Sources add their vectors, so the
 * result never averages angles across the 0/2π wrap.
 */
export function createOceanCurrentSampler(
  sources: readonly OceanCurrentConfig[],
  distance: OceanCurrentDistance
): (point: WorldPoint, out: OceanCurrentSample) => void {
  const direction: Vector = { x: 0, y: 0 };

  return (point, out) => {
    let x = 0;
    let y = 0;

    for (const source of sources) {
      const dx = point.x - source.center.x;
      const dy = point.y - source.center.y;
      const reach = distance(point, source.center);
      if (reach === 0 || reach >= source.radius) {
        continue;
      }
      FLOW_DIRECTIONS[source.flow](dx, dy, reach, direction);
      const magnitude = source.strength * Math.sin((Math.PI * reach) / source.radius);
      x += direction.x * magnitude;
      y += direction.y * magnitude;
    }

    out.strength = Math.min(1, Math.hypot(x, y));
    out.angle = out.strength === 0 ? 0 : angleOf(x, y);
  };
}

function angleOf(x: number, y: number): number {
  const angle = Math.atan2(y, x);
  return angle < 0 ? angle + TWO_PI : angle;
}
