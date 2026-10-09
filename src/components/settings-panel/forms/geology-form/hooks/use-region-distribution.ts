import { MIN_REGION_SIZE } from '../../../../../utils/map-generator/stages/geology';
import type { GeologicalRegionConfig } from '../../../../../utils/map-generator/types';
import { type BoundaryDraft, useBoundaryDraft } from '../../../../distribution-bar';
import type { DistributionSegment } from '../../../../lib/distribution-segment';
import { moveBoundary, regionShares, shareBoundaries } from '../lib/region-shares';

export interface RegionDistributionState {
  /** Areas shown by the bar; together they always make up the whole world. */
  readonly segments: readonly DistributionSegment[];
  /** Smallest share one side may keep, in percent of the whole bar. */
  readonly minShare: number;
  readonly draft: BoundaryDraft;
}

/**
 * Boundary draft of the active region shares: dragging previews locally and
 * commits only the boundary that moved.
 */
export function useRegionDistribution(
  activeSlots: readonly GeologicalRegionConfig[],
  setRegionShareBoundary: (index: number, boundary: number) => void
): RegionDistributionState {
  const segments = regionShares(activeSlots);
  const boundaries = shareBoundaries(segments);
  const totalWeight = activeSlots.reduce((sum, slot) => sum + slot.size, 0);
  const minShare = totalWeight > 0 ? (MIN_REGION_SIZE / totalWeight) * 100 : 0;
  const draft = useBoundaryDraft(
    boundaries,
    (base, index, value) => moveBoundary(base, index, value(base[index] ?? 0), totalWeight),
    next => {
      const index = next.findIndex((boundary, position) => boundary !== boundaries[position]);
      if (index >= 0) {
        setRegionShareBoundary(index, next[index] ?? 0);
      }
    }
  );
  return { segments, minShare, draft };
}
