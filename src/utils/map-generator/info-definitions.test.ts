import { DEFAULT_BASE_CLIMATE_CONFIG } from './stages/base-climate';
import { DEFAULT_MACRO_REGIONS } from './stages/macro-region';
import {
  isGeologyInfo,
  isMacroRegionInfoList,
  MAP_INFO_CATALOG,
  selectMapInfo,
} from './info-definitions';
import type { MapConfig } from './types';

const dimensions = { widthMeters: 8, heightMeters: 4, sampleWidth: 4, sampleHeight: 2 };

const baseConfig: MapConfig = {
  world: { dimensions, seed: 9, shape: 'disc' },
};

describe('selectMapInfo', () => {
  it('captures the world dimensions from the config', () => {
    expect(selectMapInfo(baseConfig).worldDimensions).toEqual(dimensions);
  });

  it('captures the macro region details in region order', () => {
    const info = selectMapInfo({ ...baseConfig, macroRegions: DEFAULT_MACRO_REGIONS });

    expect(info.macroRegionInfo).toEqual(
      DEFAULT_MACRO_REGIONS.map(region => ({
        label: region.label,
        role: region.role,
        danger: region.danger,
        kind: region.geometry.kind,
        range: expect.any(Array),
      }))
    );
  });

  it('falls back to the default regions when the config omits them', () => {
    expect(selectMapInfo(baseConfig).macroRegionInfo).toHaveLength(DEFAULT_MACRO_REGIONS.length);
  });

  it('captures the heat-zone labels and classes in zone order', () => {
    const info = selectMapInfo(baseConfig);

    expect(info.heatZoneInfo).toEqual(
      DEFAULT_BASE_CLIMATE_CONFIG.zones.map(zone => ({
        id: zone.id,
        label: zone.label,
        thermal: zone.thermal,
      }))
    );
  });

  it('exposes stable source keys', () => {
    expect(MAP_INFO_CATALOG.map(spec => spec.source)).toEqual([
      'macroRegionInfo',
      'heatZoneInfo',
      'worldDimensions',
    ]);
  });
});

describe('map info guards', () => {
  it('narrows well-formed macro region lists and rejects broken entries', () => {
    expect(
      isMacroRegionInfoList([
        { label: 'Core', role: 'base', danger: 0.2, kind: 'ring', range: [0, 0.5] },
      ])
    ).toBe(true);
    expect(isMacroRegionInfoList([{ label: 1 }])).toBe(false);
    expect(isMacroRegionInfoList('nope')).toBe(false);
  });

  it('narrows geology metadata without requiring the rasters', () => {
    expect(
      isGeologyInfo({
        regions: [{ id: 'region-1', type: 'ordinary', areaSquareMeters: 100 }],
        worldAreaSquareMeters: 400,
      })
    ).toBe(true);
    expect(isGeologyInfo({ regions: [{ id: 'region-1', type: 'unknown' }] })).toBe(false);
    expect(isGeologyInfo({ regions: [{ id: 1 }] })).toBe(false);
  });
});
