import {
  cliffinessAt,
  formProfile,
  maximumLobeModulation,
  modulatedRadials,
  type ProfileInput,
} from './profiles';
import type { WorldDimensions } from '../../../../world-dimensions';
import { createWorldSpace } from '../../../space';
import type { HeightmapNoiseBands } from '../bands';
import { REGION_SHAPES, type RegionShape } from '../config/region-shape';
import type { IslandBay, IslandForm } from '../forms/forms';

const DIMENSIONS: WorldDimensions = {
  widthMeters: 4000,
  heightMeters: 2000,
  sampleWidth: 40,
  sampleHeight: 20,
};

const SPACE = createWorldSpace(DIMENSIONS);

const BANDS: HeightmapNoiseBands = {
  large: () => 0,
  warpX: () => 0,
  warpY: () => 0,
  coast: () => 0,
  ridge: () => 0,
  fine: () => 0,
  bank: () => 0,
};

const CENTRE = { x: 0.5, y: 0.5 };

function form(overrides: Partial<IslandForm> = {}): IslandForm {
  return {
    regionIndex: 0,
    centre: CENTRE,
    peak: CENTRE,
    radiusMeters: 500,
    shelfRadiusMeters: 1000,
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

function input(
  source: IslandForm,
  shape: RegionShape,
  distMeters: number,
  overrides: Partial<ProfileInput> = {}
): ProfileInput {
  return {
    form: source,
    shape,
    band: BANDS,
    point: CENTRE,
    warped: CENTRE,
    warpedPeak: source.peak,
    distMeters,
    age: 0,
    dimensions: DIMENSIONS,
    space: SPACE,
    coast: 0,
    fine: 0,
    cliffiness: 0,
    ...overrides,
  };
}

function pointAt(bearing: number, meters: number) {
  return {
    x: CENTRE.x + (Math.cos(bearing) * meters) / DIMENSIONS.widthMeters,
    y: CENTRE.y + (Math.sin(bearing) * meters) / DIMENSIONS.heightMeters,
  };
}

describe('formProfile', () => {
  it('builds a positive dome in the middle of an ordinary island', () => {
    const sample = formProfile(input(form(), REGION_SHAPES.ordinary, 0), 0);

    expect(sample.land).toBeGreaterThan(0);
    expect(sample.carve).toBe(0);
  });

  it('returns no land and no carve outside the island', () => {
    const sample = formProfile(input(form(), REGION_SHAPES.ordinary, 800), 1.6);

    expect(sample).toEqual({ land: 0, carve: 0 });
  });

  it('sinks a reef lagoon below the waterline inside the ring', () => {
    const reef = form({ hasCavity: true });
    const sample = formProfile(input(reef, REGION_SHAPES.lagoon, 100), 0.2);

    expect(sample.land).toBe(0);
    expect(sample.carve).toBeLessThan(0);
  });

  it('raises a reef ring outside the lagoon radius', () => {
    const reef = form({ hasCavity: true });
    const sample = formProfile(input(reef, REGION_SHAPES.lagoon, 450), 0.9);

    expect(sample.land).toBeGreaterThan(0);
    expect(sample.carve).toBe(0);
  });

  it('floors a volcanic crater below its own summit', () => {
    const volcano = form({ hasCavity: true });
    const centre = formProfile(input(volcano, REGION_SHAPES.volcanic, 0), 0);

    expect(centre.land).toBeCloseTo(300 * REGION_SHAPES.volcanic.cavityFloorShare, 5);
    expect(centre.carve).toBe(0);
  });

  it('cuts at least one fjord channel and keeps land between them', () => {
    const fjord = form();
    const samples = Array.from({ length: 64 }, (_, index) => {
      const bearing = (index / 64) * Math.PI * 2;
      const point = pointAt(bearing, 400);
      return formProfile(input(fjord, REGION_SHAPES.fjord, 400, { warped: point }), 0.8);
    });

    expect(samples.some(sample => sample.carve < 0)).toBe(true);
    expect(samples.some(sample => sample.land > 0)).toBe(true);
  });
});

describe('maximumLobeModulation', () => {
  it('is one for a shape without warp or lobes', () => {
    expect(maximumLobeModulation(form(), { ...REGION_SHAPES.ordinary, warpFactor: 0 })).toBe(1);
  });

  it('grows with the warp factor and the lobes', () => {
    const plain = maximumLobeModulation(form(), REGION_SHAPES.ordinary);
    const lobes = maximumLobeModulation(form({ lobes2: 0.4 }), REGION_SHAPES.ordinary);

    expect(plain).toBeGreaterThan(1);
    expect(lobes).toBeGreaterThan(plain);
  });
});

describe('modulatedRadials', () => {
  it('keeps both radials equal without bays', () => {
    const radials = modulatedRadials(input(form(), REGION_SHAPES.ordinary, 250));

    expect(radials.withBays).toBeCloseTo(0.5);
    expect(radials.withoutBays).toBeCloseTo(0.5);
  });

  it('pushes the bay-cut radius outward at the bay bearing', () => {
    const bay: IslandBay = { angle: 0, depth: 0.5, width: 1 };
    const source = form({ bays: [bay] });
    const radials = modulatedRadials(input(source, REGION_SHAPES.ordinary, 250));

    expect(radials.withBays).toBeGreaterThan(radials.withoutBays);
  });

  it('moves the outline with the coastline lobes', () => {
    const source = form({ lobes2: 0.4 });
    const radials = modulatedRadials(input(source, REGION_SHAPES.ordinary, 250));

    expect(radials.withBays).not.toBeCloseTo(0.5);
  });
});

describe('cliffinessAt', () => {
  it('makes the summit shore sheerer than the far shore', () => {
    const shape: RegionShape = { ...REGION_SHAPES.ordinary, cliffShare: 0.3 };
    const summit = cliffinessAt(input(form(), shape, 0), 0);
    const farShore = cliffinessAt(input(form(), shape, 900, { warped: pointAt(0, 900) }), 1.5);

    expect(summit).toBeGreaterThan(farShore);
    expect(summit).toBeLessThanOrEqual(1);
    expect(farShore).toBeGreaterThanOrEqual(0);
  });

  it('stays zero for a beachy type without proximity or banks', () => {
    const beachy: RegionShape = { ...REGION_SHAPES.ordinary, cliffShare: 0 };
    const sample = cliffinessAt(input(form(), beachy, 900), 1.5);

    expect(sample).toBe(0);
  });
});
