/** Largest round 1/2/5 × 10^k value not above the given amount. */
export function roundDistance(maxMeters: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(maxMeters));
  let meters = magnitude;
  for (const step of [1, 2, 5, 10]) {
    const candidate = step * magnitude;
    if (candidate <= maxMeters) {
      meters = candidate;
    }
  }
  return meters;
}
