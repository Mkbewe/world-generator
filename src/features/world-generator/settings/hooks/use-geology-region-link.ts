import { useCallback, useEffect, useMemo } from 'react';
import { defaultRegionConfig } from '@generator/stages/geology';
import type { GeologicalRegionConfig } from '@generator/types';

import { featureIdOnLayer, useGeologyFormStore, useViewSyncStore } from '../../../../stores';
import { regionId, regionIndex } from '../forms/lib/region-id';
import type { RegionLink } from '../lib/region-data';

export function useGeologyRegionLink(): RegionLink<GeologicalRegionConfig> {
  const regionCount = useGeologyFormStore(state => state.regionCount);
  const slots = useGeologyFormStore(state => state.slots);
  const selectedFeature = useViewSyncStore(state => state.selectedFeature);
  const selectFeature = useViewSyncStore(state => state.selectFeature);
  const regions = useMemo(() => slots.slice(0, regionCount), [regionCount, slots]);
  const geologyFeatureId = featureIdOnLayer(selectedFeature, 'geology');
  const selectedIndex = activeIndex(geologyFeatureId, regionCount);
  const activeRegionId = regionId(selectedIndex);
  const selectRegionById = useCallback(
    (id: string) => selectFeature({ layerId: 'geology', featureId: id }),
    [selectFeature]
  );

  useEffect(() => {
    if (geologyFeatureId === undefined || geologyFeatureId === activeRegionId) {
      return;
    }
    selectFeature({ layerId: 'geology', featureId: activeRegionId });
  }, [activeRegionId, geologyFeatureId, selectFeature]);

  return {
    data: {
      regions,
      selectedIndex,
      selectedId: activeRegionId,
      selectedRegion: regions[selectedIndex] ?? defaultRegionConfig(),
    },
    actions: { selectRegionById },
  };
}

function activeIndex(id: string | undefined, count: number): number {
  const index = regionIndex(id) ?? 0;
  return index >= 0 && index < count ? index : 0;
}
