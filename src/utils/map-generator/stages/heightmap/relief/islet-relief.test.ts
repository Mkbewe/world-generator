import { GEOLOGICAL_REGION_TYPES, type GeologyPlan, type HeightmapConfig } from '@generator/types';

import { IsletRelief } from './islet-relief';
import type { HeightmapNoiseBands } from '../bands';
import { REGION_SHAPES, type RegionShape } from '../config/region-shape';

const POINT = { x: 0.5, y: 0.5 };
const CELL = {
  point: POINT,
  owner: 0,
  cavityDepth: 0,
  distanceToShore: 1000,
  gate: 1,
  large: 0,
};

function plan(): GeologyPlan {
  return {
    regions: [
      {
        id: 'region-1',
        type: 'ordinary',
        centre: POINT,
        thermal: 'temperate',
        weight: 1,
        areaSquareMeters: 16,
      },
    ],
    regionRasterSize: { width: 1, height: 1 },
    regionOwnerMap: new Int16Array([0]),
    regionBorderDistanceMap: new Float32Array([5000]),
    worldAreaSquareMeters: 16,
  };
}

function relief(
  overrides: Partial<HeightmapNoiseBands> = {},
  shoreWidthMeters = 100,
  configOverrides: Partial<HeightmapConfig> = {},
  shape: RegionShape = REGION_SHAPES.ordinary
): IsletRelief {
  const bands: HeightmapNoiseBands = {
    large: () => 0,
    warpX: () => 0,
    warpY: () => 0,
    coast: () => 0,
    ridge: () => 0,
    fine: () => 1,
    bank: () => 0,
    ...overrides,
  };
  const config: HeightmapConfig = { relief: 0.5, isletFrequency: 1, ...configOverrides };
  return new IsletRelief({
    plan: plan(),
    bands,
    regionBands: [bands],
    shapeAt: () => shape,
    config,
    shoreWidthMeters,
  });
}

function apply(surface: number, cell: Partial<typeof CELL> = {}): number {
  return relief().apply(surface, { ...CELL, ...cell });
}

function applyAt(
  field: IsletRelief,
  surface: number,
  point = POINT,
  distanceToShore = 1000
): number {
  return field.apply(surface, { ...CELL, point, distanceToShore });
}

describe('IsletRelief', () => {
  it('never raises a carved lagoon floor', () => {
    expect(apply(-8.5, { cavityDepth: -5 })).toBe(-8.5);
  });

  it('raises a selected rock only as a low skerry', () => {
    const height = apply(-3.5);

    expect(height).toBeGreaterThanOrEqual(2);
    expect(height).toBeLessThanOrEqual(5);
  });

  it('leaves the seabed untouched when the bump would stay underwater', () => {
    expect(applyAt(relief({ fine: () => 0.26 }), -3.5)).toBe(-3.5);
  });

  it('varies the skerry height across the full range', () => {
    const field = relief();
    const heights = Array.from({ length: 256 }, (_, index) =>
      applyAt(field, -3.5, { x: index / 256, y: ((index * 37) % 256) / 256 })
    );

    expect(Math.min(...heights)).toBeLessThanOrEqual(2.5);
    expect(Math.max(...heights)).toBeGreaterThanOrEqual(4.5);
    for (const height of heights) {
      expect(height).toBeGreaterThanOrEqual(2);
      expect(height).toBeLessThanOrEqual(5);
    }
  });

  it('keeps skerries away from existing land', () => {
    expect(apply(-3.5, { distanceToShore: 10 })).toBe(-3.5);
  });

  it('scales the shore gate with the world size', () => {
    expect(applyAt(relief({}, 100), -3.5, POINT, 40)).toBeGreaterThan(0);
    expect(applyAt(relief({}, 200), -3.5, POINT, 40)).toBe(-3.5);
  });

  it('hides every islet and bank at zero frequency', () => {
    const field = relief({ fine: () => 1, bank: () => 0.5 }, 100, { isletFrequency: 0 });

    expect(applyAt(field, -3.5)).toBe(-3.5);
    expect(applyAt(field, -80)).toBe(-80);
  });

  it('opens some coasts and leaves other coasts clean at the same frequency', () => {
    const field = relief({ fine: () => 1, bank: point => point.x - 0.5 }, 100, {
      isletFrequency: 0.5,
    });

    expect(applyAt(field, -3.5, { x: 0.25, y: 0.5 })).toBe(-3.5);
    expect(applyAt(field, -3.5, { x: 0.75, y: 0.5 })).toBeGreaterThan(0);
  });

  it('widens covered water with the islet frequency', () => {
    const points = Array.from({ length: 100 }, (_, index) => ({ x: index / 100, y: 0.5 }));
    const countAt = (frequency: number): number => {
      const field = relief({ fine: () => 1, bank: point => point.x - 0.5 }, 100, {
        isletFrequency: frequency,
      });
      return points.filter(point => applyAt(field, -3.5, point) > 0).length;
    };
    const low = countAt(0.1);
    const middle = countAt(0.5);
    const high = countAt(0.9);
    const maximum = countAt(1);

    expect(low).toBeGreaterThan(0);
    expect(middle).toBeGreaterThan(low);
    expect(high).toBeGreaterThan(middle);
    expect(maximum).toBeGreaterThanOrEqual(high);
    expect(maximum).toBeLessThan(points.length);
  });

  it('lifts banks only inside covered water', () => {
    const field = relief({ fine: () => 0, bank: point => point.x - 0.5 }, 100, {
      isletFrequency: 0.5,
    });

    expect(applyAt(field, -80, { x: 0.25, y: 0.5 })).toBe(-80);
    const lifted = applyAt(field, -80, { x: 0.95, y: 0.5 });
    expect(lifted).toBeGreaterThan(-80);
    expect(lifted).toBeLessThan(0);
  });

  it.each(GEOLOGICAL_REGION_TYPES)('raises a skerry in a %s region', type => {
    const field = relief(
      { fine: () => 1, bank: () => 0.5 },
      100,
      { isletFrequency: 1 },
      REGION_SHAPES[type]
    );

    expect(applyAt(field, -3.5)).toBeGreaterThan(0);
  });
});
