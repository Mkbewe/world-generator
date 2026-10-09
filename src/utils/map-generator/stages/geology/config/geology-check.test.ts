import { isGeologyConfig, isGeologyPlan } from './geology-check';
import { DEFAULT_GEOLOGY_CONFIG } from './presets';

describe('isGeologyConfig', () => {
  it('accepts the default configuration', () => {
    expect(isGeologyConfig(DEFAULT_GEOLOGY_CONFIG)).toBe(true);
  });

  it('rejects a count outside the supported range or a mismatched list', () => {
    expect(isGeologyConfig({ ...DEFAULT_GEOLOGY_CONFIG, regionCount: 0 })).toBe(false);
    expect(isGeologyConfig({ ...DEFAULT_GEOLOGY_CONFIG, regionCount: 11 })).toBe(false);
    expect(isGeologyConfig({ ...DEFAULT_GEOLOGY_CONFIG, regionCount: 4 })).toBe(false);
  });

  it('rejects unknown types and out-of-range region settings', () => {
    const [first, ...rest] = DEFAULT_GEOLOGY_CONFIG.regions;
    expect(
      isGeologyConfig({
        ...DEFAULT_GEOLOGY_CONFIG,
        regions: [{ ...first, type: 'lava' }, ...rest],
      })
    ).toBe(false);
    expect(
      isGeologyConfig({
        ...DEFAULT_GEOLOGY_CONFIG,
        regions: [{ ...first, size: 4 }, ...rest],
      })
    ).toBe(false);
  });

  it('rejects a layout outside the 0..1 range', () => {
    expect(
      isGeologyConfig({
        ...DEFAULT_GEOLOGY_CONFIG,
        layout: { evenness: 2, irregularity: 0 },
      })
    ).toBe(false);
  });
});

describe('isGeologyPlan', () => {
  function plan(overrides: Record<string, unknown> = {}) {
    return {
      regions: [
        {
          id: 'region-1',
          type: 'ordinary',
          centre: { x: 0.5, y: 0.5 },
          weight: 1,
          areaSquareMeters: 100,
        },
      ],
      regionRasterSize: { width: 2, height: 2 },
      regionOwnerMap: new Int16Array([0, 0, 0, 0]),
      regionBorderDistanceMap: new Float32Array([100, 100, 100, 100]),
      worldAreaSquareMeters: 400,
      ...overrides,
    };
  }

  it('accepts a consistent region raster', () => {
    expect(isGeologyPlan(plan())).toBe(true);
  });

  it('rejects an owner outside the region list', () => {
    expect(isGeologyPlan(plan({ regionOwnerMap: new Int16Array([1, 0, 0, 0]) }))).toBe(false);
    expect(
      isGeologyPlan({
        regions: [],
        regionRasterSize: { width: 1, height: 1 },
        regionOwnerMap: new Int16Array([0]),
        regionBorderDistanceMap: new Float32Array([0]),
        worldAreaSquareMeters: 400,
      })
    ).toBe(false);
  });

  it('rejects a broken id or an unknown type', () => {
    const [region] = plan().regions;
    expect(isGeologyPlan(plan({ regions: [{ ...region, id: 'region-2' }] }))).toBe(false);
    expect(isGeologyPlan(plan({ regions: [{ ...region, type: 'lava' }] }))).toBe(false);
  });
});
