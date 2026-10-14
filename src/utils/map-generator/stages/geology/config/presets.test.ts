import { isGeologyConfig } from './geology-check';
import { DEFAULT_GEOLOGY_CONFIG, GEOLOGY_PRESETS, geologyPresetConfig } from './presets';
import { MAX_GEOLOGICAL_REGIONS, MIN_GEOLOGICAL_REGIONS } from '../defaults';

describe('geology presets', () => {
  it('starts from a valid default configuration', () => {
    expect(isGeologyConfig(DEFAULT_GEOLOGY_CONFIG)).toBe(true);
  });

  it('fills every preset with a valid configuration copy', () => {
    for (const preset of GEOLOGY_PRESETS) {
      const first = geologyPresetConfig(preset);
      const second = geologyPresetConfig(preset);

      expect(isGeologyConfig(first)).toBe(true);
      expect(first.regionCount).toBeGreaterThanOrEqual(MIN_GEOLOGICAL_REGIONS);
      expect(first.regionCount).toBeLessThanOrEqual(MAX_GEOLOGICAL_REGIONS);
      expect(first.regions).toHaveLength(first.regionCount);
      expect(second).toEqual(first);
      expect(second.regions[0]).not.toBe(first.regions[0]);
    }
  });

  it('describes the intended spread of every preset', () => {
    expect(geologyPresetConfig('vast').regionCount).toBeLessThan(
      geologyPresetConfig('varied').regionCount
    );
    expect(geologyPresetConfig('mosaic').regionCount).toBeGreaterThan(
      geologyPresetConfig('varied').regionCount
    );

    const oceanicTypes = geologyPresetConfig('oceanic').regions.map(region => region.type);
    expect(oceanicTypes).toContain('lagoon');
    expect(oceanicTypes).toContain('volcanic');
  });
});
