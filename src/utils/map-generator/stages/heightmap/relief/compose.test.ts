import { createWorldSpace } from '@generator/space';
import type { GeologicalRegionPlan, GeologyPlan, HeightmapConfig } from '@generator/types';

import { composeSurfaces, measureShoreDistance, textureLand } from './compose';
import type { WorldDimensions } from '../../../../world-dimensions';
import type { HeightmapNoiseBands } from '../bands';
import { REGION_SHAPES } from '../config/region-shape';
import type { FieldContext } from '../field';

const DIMENSIONS: WorldDimensions = {
  widthMeters: 50,
  heightMeters: 50,
  sampleWidth: 5,
  sampleHeight: 5,
};

const SPACE = createWorldSpace(DIMENSIONS);
const CELLS = DIMENSIONS.sampleWidth * DIMENSIONS.sampleHeight;

const BANDS: HeightmapNoiseBands = {
  large: () => 0,
  warpX: () => 0,
  warpY: () => 0,
  coast: () => 0,
  ridge: () => 0,
  fine: () => 0,
  bank: () => 0,
};

const CONFIG: HeightmapConfig = { relief: 0.5, isletFrequency: 0 };

function region(): GeologicalRegionPlan {
  return {
    id: 'region-1',
    type: 'ordinary',
    centre: { x: 0.5, y: 0.5 },
    thermal: 'temperate',
    weight: 1,
    areaSquareMeters: 2500,
  };
}

function plan(): GeologyPlan {
  return {
    regions: [region()],
    regionRasterSize: { width: 5, height: 5 },
    regionOwnerMap: new Int16Array(CELLS),
    regionBorderDistanceMap: new Float32Array(CELLS).fill(10000),
    worldAreaSquareMeters: 2500,
  };
}

function context(overrides: Partial<FieldContext> = {}): FieldContext {
  return {
    plan: plan(),
    bands: BANDS,
    regionBands: [BANDS],
    regionShapes: [REGION_SHAPES.ordinary],
    shapeAt: () => REGION_SHAPES.ordinary,
    ownerMap: new Int16Array(CELLS),
    borderDistanceMap: new Float32Array(CELLS).fill(10000),
    worldMask: new Uint8Array(CELLS).fill(1),
    dimensions: DIMENSIONS,
    space: SPACE,
    config: CONFIG,
    landUplift: new Float32Array(CELLS),
    cavityDepth: new Float32Array(CELLS),
    shelfWeight: new Float32Array(CELLS),
    distanceToShore: new Float32Array(CELLS).fill(500),
    shoreWidthMeters: 10,
    radiusCells: new Int32Array(CELLS),
    cellMeters: 10,
    ...overrides,
  };
}

describe('measureShoreDistance', () => {
  it('measures metres from the nearest land cell', () => {
    const uplift = new Float32Array(CELLS);
    uplift[12] = 10;

    const distances = measureShoreDistance(uplift, DIMENSIONS, 10);

    expect(distances[12]).toBe(0);
    expect(distances[7]).toBe(0);
    expect(distances[0]).toBeGreaterThan(0);
    expect(distances[0]).toBeGreaterThan(distances[12]);
  });

  it('keeps the whole field infinite without land', () => {
    const distances = measureShoreDistance(new Float32Array(CELLS), DIMENSIONS, 10);

    expect(distances.every(distance => !Number.isFinite(distance))).toBe(true);
  });
});

describe('textureLand', () => {
  it('textures land only and leaves water untouched', () => {
    const field = context();
    field.landUplift[0] = 10;
    field.landUplift[1] = 0;

    textureLand(field);

    expect(field.landUplift[0]).toBeGreaterThan(10);
    expect(field.landUplift[1]).toBe(0);
  });

  it('skips cells outside the world mask', () => {
    const mask = new Uint8Array(CELLS).fill(1);
    mask[0] = 0;
    const field = context({ worldMask: mask });
    field.landUplift[0] = 10;

    textureLand(field);

    expect(field.landUplift[0]).toBe(10);
  });
});

describe('composeSurfaces', () => {
  it('writes land above the waterline and open sea below it', () => {
    const field = context();
    field.landUplift[12] = 100;
    const heightmap = new Float32Array(CELLS);
    const provenance = new Int16Array(CELLS).fill(-1);

    composeSurfaces(field, heightmap, provenance);

    expect(heightmap[12]).toBe(100);
    expect(provenance[12]).toBe(0);
    expect(heightmap[0]).toBeLessThan(0);
    expect(provenance[0]).toBe(0);
  });

  it('sinks land that reaches the region border', () => {
    const field = context();
    field.landUplift[12] = 100;
    field.borderDistanceMap[12] = 0;
    const heightmap = new Float32Array(CELLS);
    const provenance = new Int16Array(CELLS);

    composeSurfaces(field, heightmap, provenance);

    expect(heightmap[12]).toBeLessThan(0);
  });

  it('leaves cells outside the world untouched', () => {
    const mask = new Uint8Array(CELLS).fill(1);
    mask[0] = 0;
    const field = context({ worldMask: mask });
    field.landUplift[0] = 100;
    const heightmap = new Float32Array(CELLS);
    const provenance = new Int16Array(CELLS).fill(-1);

    composeSurfaces(field, heightmap, provenance);

    expect(heightmap[0]).toBe(0);
    expect(provenance[0]).toBe(-1);
  });

  it('carves a submerged lagoon floor below the waterline', () => {
    const field = context();
    field.cavityDepth[12] = -6;
    const heightmap = new Float32Array(CELLS);
    const provenance = new Int16Array(CELLS);

    composeSurfaces(field, heightmap, provenance);

    expect(heightmap[12]).toBeLessThan(0);
  });
});
