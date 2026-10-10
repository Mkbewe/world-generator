import { useState } from 'react';

import type { MacroRegionConfig } from '../../../../../utils/map-generator/types';

export interface MacroRegionSelection {
  readonly region?: MacroRegionConfig;
  readonly selectedIndex: number;
  selectRegion(index: number): void;
}

/** Region the section edits, remembered by id; removing it falls back to the first one. */
export function useMacroRegionSelection(
  regions: readonly MacroRegionConfig[]
): MacroRegionSelection {
  const [selectedId, setSelectedId] = useState<string | undefined>(regions[0]?.id);
  const found = regions.findIndex(region => region.id === selectedId);
  const selectedIndex = found >= 0 ? found : 0;

  return {
    region: regions[selectedIndex] ?? regions[0],
    selectedIndex,
    selectRegion: index => setSelectedId(regions[index]?.id),
  };
}
