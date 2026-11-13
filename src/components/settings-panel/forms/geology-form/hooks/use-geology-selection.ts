import { useEffect } from 'react';
import { defaultRegionConfig } from '@generator/stages/geology';
import type { GeologicalRegionConfig } from '@generator/types';

import { featureIdOnLayer, useViewSyncStore } from '../../../../../stores';
import { regionId, regionIndex } from '../../lib/region-id';

export interface GeologySelection {
  readonly selectedIndex: number;
  readonly selectedId: string;
  readonly region: GeologicalRegionConfig;
  selectRegionById(id: string): void;
}

/**
 * Region the form edits: the shared selection clamped to the active count, so
 * the tabs and the map always point at the same province.
 */
export function useGeologySelection(
  regionCount: number,
  slots: readonly GeologicalRegionConfig[]
): GeologySelection {
  const selectedFeature = useViewSyncStore(state => state.selectedFeature);
  const selectFeature = useViewSyncStore(state => state.selectFeature);
  const geologyFeatureId = featureIdOnLayer(selectedFeature, 'geology');
  const selectedIndex = activeIndex(geologyFeatureId, regionCount);
  const activeRegionId = regionId(selectedIndex);

  useEffect(() => {
    if (geologyFeatureId === undefined || geologyFeatureId === activeRegionId) {
      return;
    }
    selectFeature({ layerId: 'geology', featureId: activeRegionId });
  }, [activeRegionId, geologyFeatureId, selectFeature]);

  return {
    selectedIndex,
    selectedId: activeRegionId,
    region: slots[selectedIndex] ?? defaultRegionConfig(),
    selectRegionById: id => selectFeature({ layerId: 'geology', featureId: id }),
  };
}

/** Region the form edits: the selected one, or the first when it is out of range. */
function activeIndex(id: string | undefined, count: number): number {
  const index = regionIndex(id) ?? 0;
  return index >= 0 && index < count ? index : 0;
}
