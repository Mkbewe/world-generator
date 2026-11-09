import { useState } from 'react';
import type { HeatZoneConfig } from '@generator/types';

export interface HeatZoneSelection {
  readonly zone?: HeatZoneConfig;
  readonly selectedIndex: number;
  selectZone(index: number): void;
}

/** Zone the section edits, remembered by id; removing it falls back to the first one. */
export function useHeatZoneSelection(zones: readonly HeatZoneConfig[]): HeatZoneSelection {
  const [selectedId, setSelectedId] = useState<string | undefined>(zones[0]?.id);
  const found = zones.findIndex(zone => zone.id === selectedId);
  const selectedIndex = found >= 0 ? found : 0;

  return {
    zone: zones[selectedIndex] ?? zones[0],
    selectedIndex,
    selectZone: index => setSelectedId(zones[index]?.id),
  };
}
