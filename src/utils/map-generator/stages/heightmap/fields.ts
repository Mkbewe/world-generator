/** Land amplitude range, in metres, across worlds and the relief slider. */
export const MIN_LAND_AMPLITUDE_METERS = 40;
export const MAX_LAND_AMPLITUDE_METERS = 1200;

/** World size at which the amplitude reaches its full size factor. */
const AMPLITUDE_WORLD_METERS = 10_000;

/** Land amplitude for a world: how high the peaks may reach, in metres. */
export function landAmplitudeMeters(worldSizeMeters: number, relief: number): number {
  const size = clamp01(worldSizeMeters / AMPLITUDE_WORLD_METERS);
  const lean = 0.25 + 0.75 * clamp01(relief);
  const scale = 0.35 + 0.65 * size;
  return (
    MIN_LAND_AMPLITUDE_METERS +
    (MAX_LAND_AMPLITUDE_METERS - MIN_LAND_AMPLITUDE_METERS) * lean * scale
  );
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
