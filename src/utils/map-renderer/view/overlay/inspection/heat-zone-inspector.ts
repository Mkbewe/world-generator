import { isHeatZoneInfoList } from '@generator/info-definitions';
import type { MapOverlayInspection } from '@renderer/types';

import type { OverlayInspectionInput, OverlayInspector } from './overlay-inspector';
import { cellIndexAt } from './world-cell';

/** Reads the BaseClimate thermal zone under one cell. */
export class HeatZoneOverlayInspector implements OverlayInspector {
  readonly overlayId = 'heat-zones' as const;

  inspect({ x, y, mapSize, data, info }: OverlayInspectionInput): MapOverlayInspection | undefined {
    const index = cellIndexAt(mapSize, x, y);
    const map = data.heatZoneMap;
    if (index === undefined || !(map instanceof Int16Array)) {
      return undefined;
    }
    const zone = map[index];
    const zones = info.heatZoneInfo;
    if (zone === undefined || zone < 0 || !isHeatZoneInfoList(zones)) {
      return undefined;
    }
    const zoneInfo = zones[zone];
    return zoneInfo ? { overlayId: 'heat-zones', value: zoneInfo.label } : undefined;
  }
}
