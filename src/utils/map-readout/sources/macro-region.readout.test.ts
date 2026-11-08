import { macroRegionReadout } from './macro-region.readout';
import type { RasterReadoutInspection, ReadoutContext } from '../contracts';

function context(info: ReadoutContext['info'] = {}): ReadoutContext {
  return { info, options: {} };
}

function inspection(value?: number): RasterReadoutInspection {
  return { kind: 'raster', layerId: 'macro-region', labelKey: 'layers.macroRegions', value };
}

function item(info: ReadoutContext['info'], value: number, id: string) {
  return macroRegionReadout.read(inspection(value), context(info))?.find(entry => entry.id === id);
}

describe('macroRegionReadout', () => {
  const regions = [
    { label: 'Safe haven', role: 'base', danger: 0.1, kind: 'ring', range: [0, 0.25] },
    { label: 'Wasteland', role: 'base', danger: 0.9, kind: 'ring', range: [0.25, 0.5] },
  ];
  const info = { macroRegionInfo: regions, macroRegionAreas: [2_000_000, 6_000_000] };

  it('shows the region label, range, width, danger and area', () => {
    expect(item(info, 1, 'region')?.value).toBe('Wasteland');
    expect(item(info, 1, 'range')?.value).toMatchObject({ key: 'readout.rangeRing' });
    expect(item(info, 1, 'width')).toMatchObject({
      labelKey: 'readout.ringThickness',
      value: '50%',
    });
    expect(item(info, 1, 'danger')?.value).toBe('0.90');
    expect(item(info, 1, 'area')?.value).toMatchObject({ key: 'readout.areaShare' });
  });

  it('shows an overlay band coverage and its axis range', () => {
    const overlay = {
      macroRegionInfo: [
        { label: 'Crossing', role: 'overlay', danger: 0.5, kind: 'band', range: [0.42, 0.58] },
      ],
    };

    expect(item(overlay, 0, 'width')).toMatchObject({
      labelKey: 'readout.bandWidth',
      value: '16%',
    });
    expect(item(overlay, 0, 'range')?.value).toMatchObject({ key: 'readout.rangeBand' });
    expect(item(overlay, 0, 'area')).toBeUndefined();
  });

  it('falls back to the region number for malformed info', () => {
    expect(item({ macroRegionInfo: 'nope' }, 1, 'value')).toEqual({
      id: 'value',
      labelKey: 'readout.value',
      value: { key: 'readout.regionIndex', params: { index: 1 } },
    });
    expect(item({ macroRegionInfo: [{ label: 1 }] }, 1, 'value')?.value).toMatchObject({
      key: 'readout.regionIndex',
    });
  });

  it('leaves an unavailable sample to the default item', () => {
    expect(macroRegionReadout.read(inspection(), context(info))).toBeUndefined();
  });
});
