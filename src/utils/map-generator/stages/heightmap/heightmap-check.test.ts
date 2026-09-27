import { DEFAULT_HEIGHTMAP_CONFIG } from './defaults';
import { isHeightmapConfig } from './heightmap-check';

describe('isHeightmapConfig', () => {
  it('accepts the default configuration', () => {
    expect(isHeightmapConfig(DEFAULT_HEIGHTMAP_CONFIG)).toBe(true);
  });

  it('rejects out-of-range and malformed values', () => {
    expect(isHeightmapConfig({ ...DEFAULT_HEIGHTMAP_CONFIG, relief: 1.2 })).toBe(false);
    expect(isHeightmapConfig({ ...DEFAULT_HEIGHTMAP_CONFIG, featureScale: -0.1 })).toBe(false);
    expect(isHeightmapConfig(undefined)).toBe(false);
  });
});
