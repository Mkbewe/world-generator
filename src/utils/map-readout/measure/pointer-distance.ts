import type { WorldSpace } from '../../map-generator/space';
import type { Measurement, PointerSample } from '../contracts';

/** Distance of two pointer samples through the shared spatial port. */
export function segmentMeters(space: WorldSpace, from: PointerSample, to: PointerSample): number {
  return space.distanceMeters({ x: from.u, y: from.v }, { x: to.u, y: to.v });
}

/** Total length of a measured path, including its preview segment. */
export function measurementMeters(space: WorldSpace, measurement: Measurement): number {
  const points = measurement.preview
    ? [...measurement.points, measurement.preview]
    : measurement.points;
  let total = 0;
  for (let index = 1; index < points.length; index++) {
    const from = points[index - 1];
    const to = points[index];
    if (from && to) {
      total += segmentMeters(space, from, to);
    }
  }
  return total;
}
