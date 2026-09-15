import { DEFAULT_MACRO_REGIONS } from './stages/macro-region-defaults';
import { MAP_INFO_CATALOG, selectMapInfo } from './info-definitions';
import type { MapConfig } from './types';

const baseConfig: MapConfig = {
  world: { width: 4, height: 4, seed: 9 },
  noise: { frequency: 2, octaves: 2, persistence: 0.5, lacunarity: 2 },
};

const dimensionsOf = (width: number, height: number) => ({
  widthMeters: width,
  heightMeters: height,
  sampleWidth: width,
  sampleHeight: height,
});

describe('selectMapInfo', () => {
  it('captures world dimensions derived from the sample grid', () => {
    expect(selectMapInfo(baseConfig)).toEqual({ worldDimensions: dimensionsOf(4, 4) });
  });

  it('derives meters from the detail per sample', () => {
    const config: MapConfig = {
      ...baseConfig,
      world: { ...baseConfig.world, width: 4, height: 2, metersPerSample: 2 },
    };

    expect(selectMapInfo(config)).toEqual({
      worldDimensions: { widthMeters: 8, heightMeters: 4, sampleWidth: 4, sampleHeight: 2 },
    });
  });

  it('captures macro region labels in region order', () => {
    expect(selectMapInfo({ ...baseConfig, macroRegions: DEFAULT_MACRO_REGIONS })).toEqual({
      macroRegionLabels: DEFAULT_MACRO_REGIONS.map(region => region.label),
      worldDimensions: dimensionsOf(4, 4),
    });
  });

  it('rejects configs above the sample budget', () => {
    const config: MapConfig = {
      ...baseConfig,
      world: { width: 5000, height: 5000, seed: 9 },
    };

    expect(() => selectMapInfo(config)).toThrow(RangeError);
  });

  it('exposes stable source keys', () => {
    expect(MAP_INFO_CATALOG.map(spec => spec.source)).toEqual([
      'macroRegionLabels',
      'worldDimensions',
    ]);
  });
});
