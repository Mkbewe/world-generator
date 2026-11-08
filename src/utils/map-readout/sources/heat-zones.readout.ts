import { type HeatZoneInfo, isHeatZoneInfoList } from '../../map-generator/info-definitions';
import { defineRasterReadout, type ReadoutInfo } from '../contracts';

interface HeatZonePayload {
  readonly zones?: readonly HeatZoneInfo[];
}

function parseHeatZones(info: ReadoutInfo): HeatZonePayload {
  return { zones: isHeatZoneInfoList(info.heatZoneInfo) ? info.heatZoneInfo : undefined };
}

/** Name and thermal class of the heat zone under the pointer. */
export const heatZoneReadout = defineRasterReadout(
  'heat-zones',
  parseHeatZones,
  (payload, inspection) => {
    const index = inspection.value;
    if (index === undefined) {
      return undefined;
    }
    const zone = payload.zones?.[index];
    if (!zone) {
      return [{ id: 'value', labelKey: 'readout.value', value: String(index) }];
    }
    return [
      { id: 'zone', labelKey: 'readout.heatZone', value: zone.label },
      { id: 'thermal', labelKey: 'readout.class', value: { key: `readout.${zone.thermal}` } },
    ];
  }
);
