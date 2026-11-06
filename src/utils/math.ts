/** Clamps a value to the 0..1 range. */
export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Smooth Hermite interpolation of a value, clamped to the 0..1 domain. */
export function smoothstep(value: number): number {
  const clamped = Math.max(0, Math.min(1, value));
  return clamped * clamped * (3 - 2 * clamped);
}
