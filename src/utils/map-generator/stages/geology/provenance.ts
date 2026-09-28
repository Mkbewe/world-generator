import type { GeologyPlan } from '../../types';

/**
 * Maps every area id to the index written into the diagnostic provenance map.
 * `GeologyPlan.areas` is ordered by id, so the index is independent of the
 * config list order; a cell outside every area keeps `PROVENANCE_OUTSIDE`.
 */
export function createProvenanceIndex(plan: GeologyPlan): ReadonlyMap<string, number> {
  const index = new Map<string, number>();
  plan.areas.forEach((area, position) => {
    index.set(area.id, position);
  });
  return index;
}
