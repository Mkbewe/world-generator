import { DEFAULT_MACRO_REGIONS } from './stages/macro-region';
import { MAP_INFO_CATALOG, selectMapInfo } from './info-definitions';
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

  it('exposes stable source keys', () => {
    expect(MAP_INFO_CATALOG.map(spec => spec.source)).toEqual([
      'macroRegionInfo',
      'worldDimensions',
    ]);
  });
});
