/** Outline of the generated world. */
export type WorldShape = 'disc' | 'rectangle';

export const DEFAULT_WORLD_SHAPE: WorldShape = 'disc';

/** Tests the same normalized shape used by the generated world mask. */
export function containsWorld(shape: WorldShape, x: number, y: number): boolean {
  return shape === 'rectangle' ? Math.abs(x) <= 1 && Math.abs(y) <= 1 : x * x + y * y <= 1;
}

/**
 * Mask containment of a normalized 0..1 point. The only place that maps the
 * canonical frame onto the mask predicate's `-1..1` frame — stages probe the
 * mask through here, never through a local `2 * x - 1` conversion.
 */
export function containsNormalized(
  shape: WorldShape,
  point: { readonly x: number; readonly y: number }
): boolean {
  return containsWorld(shape, 2 * point.x - 1, 2 * point.y - 1);
}
