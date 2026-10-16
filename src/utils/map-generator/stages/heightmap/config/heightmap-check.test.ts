import { isHeightmapConfig } from './heightmap-check';
import { DEFAULT_HEIGHTMAP_CONFIG } from '../defaults';

describe('isHeightmapConfig', () => {
  it('accepts the default configuration', () => {
    expect(isHeightmapConfig(DEFAULT_HEIGHTMAP_CONFIG)).toBe(true);
  });

  it('rejects values outside their ranges', () => {
    expect(isHeightmapConfig({ ...DEFAULT_HEIGHTMAP_CONFIG, relief: 2 })).toBe(false);
    expect(isHeightmapConfig({ ...DEFAULT_HEIGHTMAP_CONFIG, isletFrequency: -1 })).toBe(false);
  });

  it('checks the optional per-region terrain list', () => {
    const terrain = {
      landShare: 0.5,
      concentration: 0.5,
      clustering: 0.5,
      age: 0.5,
      mountainousness: 0.5,
      ringShare: 0.5,
    };

    expect(isHeightmapConfig({ ...DEFAULT_HEIGHTMAP_CONFIG, regions: [] })).toBe(true);
    expect(isHeightmapConfig({ ...DEFAULT_HEIGHTMAP_CONFIG, regions: [terrain] })).toBe(true);
    expect(
      isHeightmapConfig({ ...DEFAULT_HEIGHTMAP_CONFIG, regions: [{ ...terrain, age: 2 }] })
    ).toBe(false);
    expect(
      isHeightmapConfig({ ...DEFAULT_HEIGHTMAP_CONFIG, regions: [{ ...terrain, landShare: -1 }] })
    ).toBe(false);
    expect(isHeightmapConfig({ ...DEFAULT_HEIGHTMAP_CONFIG, regions: 'nope' })).toBe(false);
  });

  it('rejects configs with missing fields', () => {
    expect(isHeightmapConfig({ relief: 0.5 })).toBe(false);
    expect(isHeightmapConfig(null)).toBe(false);
  });
});
