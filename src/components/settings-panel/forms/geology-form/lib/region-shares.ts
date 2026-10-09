import {
  MAX_REGION_SIZE,
  MIN_REGION_SIZE,
} from '../../../../../utils/map-generator/stages/geology';
import type { GeologicalRegionConfig } from '../../../../../utils/map-generator/types';
import type { DistributionSegment } from '../../../../lib/distribution-segment';

/** Areas shown by the geology bar; together they always make up the whole world. */
export function regionShares(regions: readonly GeologicalRegionConfig[]): DistributionSegment[] {
  const total = regions.reduce((sum, region) => sum + region.size, 0) || 1;
  return regions.map((region, index) => ({
    id: `region-${index + 1}`,
    percent: (region.size / total) * 100,
  }));
}

export function shareBoundaries(shares: readonly DistributionSegment[]): number[] {
  let cursor = 0;
  return shares.slice(0, -1).map(share => {
    cursor += share.percent;
    return cursor;
  });
}

/** Converts the bar shares back into the relative weights consumed by the generator. */
export function moveBoundary(
  boundaries: readonly number[],
  index: number,
  requested: number,
  totalWeight: number
): number[] {
  if (index < 0 || index >= boundaries.length || !Number.isFinite(requested)) {
    return [...boundaries];
  }
  const previous = index === 0 ? 0 : (boundaries[index - 1] ?? 0);
  const next = index === boundaries.length - 1 ? 100 : (boundaries[index + 1] ?? 100);
  const minimum = (MIN_REGION_SIZE / totalWeight) * 100;
  const maximum = (MAX_REGION_SIZE / totalWeight) * 100;
  const lower = Math.max(previous + minimum, next - maximum);
  const upper = Math.min(previous + maximum, next - minimum);
  return boundaries.map((boundary, position) =>
    position === index ? Math.max(lower, Math.min(upper, requested)) : boundary
  );
}
