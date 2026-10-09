import { useEffect } from 'react';

import { useViewSyncStore } from '../../../../../stores';
import { defaultRegionConfig } from '../../../../../utils/map-generator/stages/geology';
import type { GeologicalRegionConfig } from '../../../../../utils/map-generator/types';

export interface GeologySelection {
  readonly selectedIndex: number;
  readonly region: GeologicalRegionConfig;
  selectRegion(index: number): void;
}

/**
 * Region the form edits: the shared selection clamped to the active count, so
 * the tabs and the map always point at the same province.
 */
export function useGeologySelection(
  regionCount: number,
  slots: readonly GeologicalRegionConfig[]
): GeologySelection {
  const selectedRegionId = useViewSyncStore(state => state.selectedRegionId);
  const setSelectedRegion = useViewSyncStore(state => state.setSelectedRegion);
  const selectedIndex = activeIndex(selectedRegionId, regionCount);
  const activeRegionId = `region-${selectedIndex + 1}`;

  useEffect(() => {
    if (selectedRegionId !== undefined && selectedRegionId !== activeRegionId) {
      setSelectedRegion(activeRegionId);
    }
  }, [activeRegionId, selectedRegionId, setSelectedRegion]);

  return {
    selectedIndex,
    region: slots[selectedIndex] ?? defaultRegionConfig(),
    selectRegion: index => setSelectedRegion(`region-${index + 1}`),
  };
}

/** Region the form edits: the selected one, or the first when it is out of range. */
function activeIndex(regionId: string | undefined, count: number): number {
  const match = regionId ? /^region-(\d+)$/.exec(regionId) : null;
  const index = match ? Number(match[1]) - 1 : 0;
  return index >= 0 && index < count ? index : 0;
}
