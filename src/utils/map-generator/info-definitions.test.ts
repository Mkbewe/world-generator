import { DEFAULT_MACRO_REGIONS } from './stages/macro-region-defaults';
import { MAP_INFO_CATALOG, selectMapInfo } from './info-definitions';
import type { MapConfig } from './types';

const baseConfig: MapConfig = {
  world: { width: 4, height: 4, seed: 9 },
  noise: { frequency: 2, octaves: 2, persistence: 0.5, lacunarity: 2 },
};

describe('selectMapInfo', () => {
  it('is empty without non-raster configuration', () => {
    expect(selectMapInfo(baseConfig)).toEqual({});
  });

  it('captures macro region labels in region order', () => {
    expect(selectMapInfo({ ...baseConfig, macroRegions: DEFAULT_MACRO_REGIONS })).toEqual({
      macroRegionLabels: DEFAULT_MACRO_REGIONS.map(region => region.label),
    });
  });

  it('exposes stable source keys', () => {
    expect(MAP_INFO_CATALOG.map(spec => spec.source)).toEqual(['macroRegionLabels']);
  });
});
