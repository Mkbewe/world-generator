/** One segment of the distribution bar: an id, its share, and optional color. */
export interface DistributionSegment {
  readonly id: string;
  readonly percent: number;
  readonly color?: readonly [number, number, number];
}
