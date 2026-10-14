import { analyzeLand } from './land-components';
import type { GeologyPlan } from '../types';

const DIMENSIONS = { widthMeters: 4, heightMeters: 2, sampleWidth: 4, sampleHeight: 2 };

/** One region owning a 4x2 raster; the metadata matches the current contract. */
function plan(): GeologyPlan {
  return {
    regions: [
      {
        id: 'region-1',
        type: 'ordinary',
        centre: { x: 0.5, y: 0.5 },
        weight: 1,
        areaSquareMeters: 8,
      },
    ],
    regionRasterSize: { width: 4, height: 2 },
    regionOwnerMap: new Int16Array(8).fill(0),
    regionBorderDistanceMap: new Float32Array(8).fill(2),
    worldAreaSquareMeters: 8,
  };
}

/** Heights are relative to the sea level, so the waterline is 0. */
function analyze(heightmap: Float32Array) {
  return analyzeLand({
    heightmap,
    provenanceMap: new Int16Array(8).fill(0),
    plan: plan(),
    dimensions: DIMENSIONS,
    worldMask: new Uint8Array(8).fill(1),
  });
}

describe('analyzeLand', () => {
  it('labels connected land above the waterline', () => {
    const analysis = analyze(new Float32Array([10, 10, -40, -40, -40, -40, -40, -40]));

    expect(analysis.landCells).toBe(2);
    expect(analysis.components).toHaveLength(1);
    expect(analysis.landShare).toBeCloseTo(0.25);
    expect(analysis.maxHeight).toBe(10);
    expect(analysis.byRegion.get('region-1')?.landCells).toBe(2);
  });

  it('separates land pieces that do not touch', () => {
    const analysis = analyze(new Float32Array([10, -40, 10, -40, -40, -40, -40, 10]));

    expect(analysis.components).toHaveLength(3);
  });
});
