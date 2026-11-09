import { createWorldSpace } from '@generator/space';
import type { GeologicalRegionPlan, GeologyPlan, HeightmapConfig } from '@generator/types';

import { effectiveBorderDistances, smoothUplift, stampForms } from './stamping';
import type { WorldDimensions } from '../../../../world-dimensions';
import type { HeightmapNoiseBands } from '../bands';
import { REGION_SHAPES } from '../config/region-shape';
import type { FieldContext } from '../field';
import type { IslandForm } from '../forms/forms';

const DIMENSIONS: WorldDimensions = {
  widthMeters: 110,
  heightMeters: 110,
  sampleWidth: 11,
  sampleHeight: 11,
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
    areaSquareMeters: DIMENSIONS.widthMeters * DIMENSIONS.heightMeters,
  };
}

function plan(): GeologyPlan {
  return {
    regions: [region()],
    regionRasterSize: { width: DIMENSIONS.sampleWidth, height: DIMENSIONS.sampleHeight },
    regionOwnerMap: new Int16Array(CELLS),
    regionBorderDistanceMap: new Float32Array(CELLS).fill(10000),
    worldAreaSquareMeters: DIMENSIONS.widthMeters * DIMENSIONS.heightMeters,
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
    distanceToShore: new Float32Array(CELLS),
    shoreWidthMeters: 10,
    radiusCells: new Int32Array(CELLS),
    cellMeters: 10,
    ...overrides,
  };
}

function form(overrides: Partial<IslandForm> = {}): IslandForm {
  return {
    regionIndex: 0,
    centre: { x: 0.5, y: 0.5 },
    peak: { x: 0.5, y: 0.5 },
    radiusMeters: 30,
    shelfRadiusMeters: 60,
    peakMeters: 300,
    angleRadians: 0,
    aspect: 1,
    bend: 0,
    mountainFactor: 0.5,
    lobes2: 0,
    phase2: 0,
    lobes3: 0,
    phase3: 0,
    lobes4: 0,
    phase4: 0,
    hasCavity: false,
    shape: REGION_SHAPES.ordinary,
    chutePhase: 0,
    bays: [],
    reefGap: 0,
    ...overrides,
  };
}

describe('effectiveBorderDistances', () => {
  it('measures the world rim as a border', () => {
    const mask = new Uint8Array(CELLS).fill(1);
    const regionDistances = new Float32Array(CELLS).fill(10000);

    const effective = effectiveBorderDistances(regionDistances, mask, SPACE, DIMENSIONS);

    expect(effective[0]).toBeGreaterThan(0);
    expect(effective[0]).toBeLessThan(100);
    expect(effective[60]).toBeGreaterThan(effective[0]);
    expect(effective[60]).toBeLessThan(10000);
  });

  it('keeps the region border distance when it is smaller than the rim', () => {
    const mask = new Uint8Array(CELLS).fill(1);
    const regionDistances = new Float32Array(CELLS).fill(10000);
    regionDistances[60] = 3;

    const effective = effectiveBorderDistances(regionDistances, mask, SPACE, DIMENSIONS);

    expect(effective[60]).toBe(3);
  });

  it('leaves cells outside the mask on their region distance', () => {
    const mask = new Uint8Array(CELLS).fill(1);
    mask[0] = 0;
    const regionDistances = new Float32Array(CELLS).fill(10000);
    regionDistances[0] = 42;

    const effective = effectiveBorderDistances(regionDistances, mask, SPACE, DIMENSIONS);

    expect(effective[0]).toBe(42);
  });
});

describe('smoothUplift', () => {
  it('keeps a constant field constant', () => {
    const uplift = new Float32Array(CELLS).fill(5);
    const radius = new Int32Array(CELLS).fill(1);

    smoothUplift(uplift, radius, 11, 11, 2);

    expect([...uplift].every(value => value === 5)).toBe(true);
  });

  it('spreads an impulse over its neighbourhood and lowers the peak', () => {
    const uplift = new Float32Array(CELLS);
    uplift[60] = 100;
    const radius = new Int32Array(CELLS).fill(1);

    smoothUplift(uplift, radius, 11, 11, 1);

    expect(uplift[60]).toBeLessThan(100);
    expect(uplift[60]).toBeCloseTo(100 / 9);
    expect(uplift[59]).toBeCloseTo(100 / 9);
    expect(uplift[50]).toBeCloseTo(100 / 9);
  });

  it('spreads wider with a larger radius', () => {
    const narrow = new Float32Array(CELLS);
    narrow[60] = 100;
    const wide = new Float32Array(CELLS);
    wide[60] = 100;
    const narrowRadius = new Int32Array(CELLS).fill(1);
    const wideRadius = new Int32Array(CELLS).fill(2);

    smoothUplift(narrow, narrowRadius, 11, 11, 1);
    smoothUplift(wide, wideRadius, 11, 11, 1);

    expect(wide[60]).toBeLessThan(narrow[60]);
    expect(wide[38]).toBeGreaterThan(0);
  });
});

describe('stampForms', () => {
  it('stamps land and its smoothing radius at the form centre', () => {
    const field = context();

    stampForms(field, [form()]);

    expect(field.landUplift[60]).toBeGreaterThan(0);
    expect(field.shelfWeight[60]).toBe(1);
    expect([...field.radiusCells].some(radius => radius > 0)).toBe(true);
  });

  it('writes nothing far outside the form footprint', () => {
    const field = context();

    stampForms(field, [form()]);

    expect(field.landUplift[0]).toBe(0);
    expect(field.shelfWeight[0]).toBe(0);
    expect(field.radiusCells[0]).toBe(0);
  });

  it('carves a lagoon floor into the cavity buffer', () => {
    const field = context();
    const reef = form({ hasCavity: true, shape: REGION_SHAPES.lagoon });

    stampForms(field, [reef]);

    expect(field.cavityDepth[60]).toBeLessThan(0);
    expect(field.landUplift[60]).toBe(0);
  });

  it('skips cells outside the world mask', () => {
    const mask = new Uint8Array(CELLS).fill(1);
    mask[60] = 0;
    const field = context({ worldMask: mask });

    stampForms(field, [form()]);

    expect(field.landUplift[60]).toBe(0);
  });
});
