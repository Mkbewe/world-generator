import { heatZoneReadout } from './heat-zones.readout';
import type { RasterReadoutInspection, ReadoutContext } from '../contracts';

const zones = [
  { id: 'cold', label: 'Cold rim', thermal: 'cold' as const },
  { id: 'warm', label: 'Warm core', thermal: 'warm' as const },
];

function context(info: ReadoutContext['info'] = {}): ReadoutContext {
  return { info, options: {} };
}

function inspection(value?: number): RasterReadoutInspection {
  return { kind: 'raster', layerId: 'heat-zones', labelKey: 'layers.heatZones', value };
}

describe('heatZoneReadout', () => {
  it('shows the heat zone name and class', () => {
    const items = heatZoneReadout.read(inspection(1), context({ heatZoneInfo: zones }));

    expect(items).toEqual([
      { id: 'zone', labelKey: 'readout.heatZone', value: 'Warm core' },
      { id: 'thermal', labelKey: 'readout.class', value: { key: 'readout.warm' } },
    ]);
  });

  it('falls back to the zone index when the list is malformed', () => {
    expect(heatZoneReadout.read(inspection(2), context({ heatZoneInfo: 'nope' }))).toEqual([
      { id: 'value', labelKey: 'readout.value', value: '2' },
    ]);
  });

  it('leaves an unavailable sample to the default item', () => {
    expect(heatZoneReadout.read(inspection(), context())).toBeUndefined();
  });
});
