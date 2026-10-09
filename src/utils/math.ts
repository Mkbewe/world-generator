/** Smooth Hermite interpolation of a value, clamped to the 0..1 domain. */
export function smoothstep(value: number): number {
  const clamped = Math.max(0, Math.min(1, value));
  return clamped * clamped * (3 - 2 * clamped);
}
