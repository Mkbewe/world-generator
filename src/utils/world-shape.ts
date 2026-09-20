/** Outline of the generated world. */
export type WorldShape = 'disc' | 'rectangle';

export const DEFAULT_WORLD_SHAPE: WorldShape = 'disc';

/** Tests the same normalized shape used by the generated world mask. */
export function containsWorld(shape: WorldShape, x: number, y: number): boolean {
  return shape === 'rectangle' ? Math.abs(x) <= 1 && Math.abs(y) <= 1 : x * x + y * y <= 1;
}
