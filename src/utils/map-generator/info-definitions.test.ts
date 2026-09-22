import { DEFAULT_MACRO_REGIONS } from './stages/macro-region-defaults';
import { MAP_INFO_CATALOG, selectMapInfo } from './info-definitions';
import type { MapConfig } from './types';

const dimensions = { widthMeters: 8, heightMeters: 4, sampleWidth: 4, sampleHeight: 2 };

const baseConfig: MapConfig = {
  world: { dimensions, seed: 9, shape: 'disc' },
  noise: { frequency: 2, octaves: 2, persistence: 0.5, lacunarity: 2 },
};

describe('selectMapInfo', () => {
  it('captures the world dimensions from the config', () => {
    expect(selectMapInfo(baseConfig)).toEqual({ worldDimensions: dimensions });
  });

  it('captures macro region labels in region order', () => {
    expect(selectMapInfo({ ...baseConfig, macroRegions: DEFAULT_MACRO_REGIONS })).toEqual({
      macroRegionLabels: DEFAULT_MACRO_REGIONS.map(region => region.label),
      worldDimensions: dimensions,
    });
  });

  it('exposes stable source keys', () => {
    expect(MAP_INFO_CATALOG.map(spec => spec.source)).toEqual([
      'macroRegionLabels',
      'worldDimensions',
    ]);
  });
});
