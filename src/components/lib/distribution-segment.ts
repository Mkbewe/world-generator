/** One segment of the distribution bar: an id and its share of the whole, in percent. */
export interface DistributionSegment {
  readonly id: string;
  readonly percent: number;
}
