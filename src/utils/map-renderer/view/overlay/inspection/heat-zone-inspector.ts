import type { OverlayInspectionInput, OverlayInspector } from './overlay-inspector';
import { isHeatZoneInfoList } from '../../../../map-generator/info-definitions';
import type { MapOverlayInspection } from '../../../types';

/** Reads the BaseClimate thermal zone under one cell. */
export class HeatZoneOverlayInspector implements OverlayInspector {
  readonly overlayId = 'heat-zones' as const;

  inspect({ x, y, mapSize, data, info }: OverlayInspectionInput): MapOverlayInspection | undefined {
    const map = data.heatZoneMap;
    const zone = map instanceof Int16Array ? heatZoneAt(map, mapSize, x, y) : undefined;
    const zones = info.heatZoneInfo;
    if (zone === undefined || !isHeatZoneInfoList(zones)) {
      return undefined;
    }
    const zoneInfo = zones[zone];
    return zoneInfo
      ? { overlayId: 'heat-zones', label: 'Heat zone', value: zoneInfo.label }
      : undefined;
  }
}

function heatZoneAt(
  map: Int16Array,
  mapSize: OverlayInspectionInput['mapSize'],
  x: number,
  y: number
): number | undefined {
  if (!mapSize || x < 0 || y < 0 || x >= mapSize.width || y >= mapSize.height) {
    return undefined;
  }
  const zone = map[y * mapSize.width + x];
  return zone !== undefined && zone >= 0 ? zone : undefined;
}
