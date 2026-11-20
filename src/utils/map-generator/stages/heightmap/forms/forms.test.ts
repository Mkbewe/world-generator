import { RandomFactory } from '@generator/random';
import { createWorldSpace } from '@generator/space';
import type {
  GeologicalRegionPlan,
  GeologicalRegionType,
  GeologyPlan,
  RegionTerrainConfig,
  WorldPoint,
} from '@generator/types';

import { buildRegionForms, collectRegionInteriors } from './forms';
import type { WorldDimensions } from '../../../../world-dimensions';
import { containsNormalized } from '../../../../world-shape';
import { REGION_SHAPES, type RegionShape } from '../config/region-shape';
import { regionShapeFor } from '../config/region-shape-variants';

const DIMENSIONS: WorldDimensions = {
  widthMeters: 4000,
  heightMeters: 2000,
  sampleWidth: 64,
  sampleHeight: 32,
};

const FINE_DIMENSIONS: WorldDimensions = {
  widthMeters: 4000,
  heightMeters: 2000,
  sampleWidth: 256,
  sampleHeight: 128,
};

const SMALL_DIMENSIONS: WorldDimensions = {
  widthMeters: 3000,
  heightMeters: 3000,
  sampleWidth: 64,
  sampleHeight: 64,
};

const LARGE_DIMENSIONS: WorldDimensions = {
  widthMeters: 12_000,
  heightMeters: 12_000,
  sampleWidth: 64,
  sampleHeight: 64,
};

/** Beyond the UI's 12 km maximum, used only for the safety cap. */
const EXTREME_DIMENSIONS: WorldDimensions = {
  widthMeters: 48_000,
  heightMeters: 48_000,
  sampleWidth: 64,
  sampleHeight: 64,
};

const CELLS = DIMENSIONS.sampleWidth * DIMENSIONS.sampleHeight;

function region(
  index: number,
  type: GeologicalRegionType,
  dimensions: WorldDimensions = DIMENSIONS
): GeologicalRegionPlan {
  return {
    id: `region-${index + 1}`,
    type,
    centre: { x: (index + 0.5) / 2, y: 0.5 },
    thermal: 'temperate',
    weight: 1,
    areaSquareMeters: dimensions.widthMeters * dimensions.heightMeters,
  };
}

/** One region's terrain overrides; the rest falls back to neutral values. */
function terrain(overrides: Partial<RegionTerrainConfig> = {}): RegionTerrainConfig {
  return {
    landShare: 0.5,
    concentration: 0.5,
    clustering: 0.35,
    age: 0.5,
    mountainousness: 0.6,
    ringShare: 0,
    ...overrides,
  };
}

/** One-region plans use a far border; two-region plans split the world in half. */
function plan(
  regions: readonly GeologicalRegionPlan[],
  worldMask?: Uint8Array,
  dimensions: WorldDimensions = DIMENSIONS
): GeologyPlan {
  const cells = dimensions.sampleWidth * dimensions.sampleHeight;
  const cellMeters = dimensions.widthMeters / dimensions.sampleWidth;
  const mask = worldMask ?? new Uint8Array(cells).fill(1);
  const owner = new Int16Array(cells);
  const border = new Float32Array(cells);
  const twoRegions = regions.length === 2;
  for (let y = 0; y < dimensions.sampleHeight; y++) {
    for (let x = 0; x < dimensions.sampleWidth; x++) {
      const index = y * dimensions.sampleWidth + x;
      if (mask[index] === 0) {
        owner[index] = -1;
        continue;
      }
      if (twoRegions) {
        const left = x < dimensions.sampleWidth / 2;
        owner[index] = left ? 0 : 1;
        const offset = left ? dimensions.sampleWidth / 2 - 1 - x : x - dimensions.sampleWidth / 2;
        border[index] = offset * cellMeters + cellMeters / 2;
      } else {
        owner[index] = 0;
        border[index] = 5000;
      }
    }
  }
  return {
    regions,
    regionRasterSize: { width: dimensions.sampleWidth, height: dimensions.sampleHeight },
    regionOwnerMap: owner,
    regionBorderDistanceMap: border,
    worldAreaSquareMeters: dimensions.widthMeters * dimensions.heightMeters,
  };
}

/** Forms of one region, built exactly like the stage builds them. */
function regionForms(
  type: GeologicalRegionType,
  dimensions: WorldDimensions = DIMENSIONS,
  mask?: Uint8Array,
  shape?: RegionShape,
  shapeAt?: (point: WorldPoint) => RegionShape,
  terrainOverrides: Partial<RegionTerrainConfig> = {}
): {
  readonly forms: ReturnType<typeof buildRegionForms>;
  readonly space: ReturnType<typeof createWorldSpace>;
  readonly anchor: GeologicalRegionPlan;
} {
  const space = createWorldSpace(dimensions);
  const source = plan([region(0, type, dimensions)], mask, dimensions);
  const anchor = source.regions[0];
  if (!anchor) {
    throw new Error('The plan must carry the region.');
  }
  const regionShape = shape ?? REGION_SHAPES[anchor.type];
  const forms = buildRegionForms({
    regionIndex: 0,
    region: anchor,
    shape: regionShape,
    shapeAt: shapeAt ?? (() => regionShape),
    terrain: terrain(terrainOverrides),
    cells:
      collectRegionInteriors(source, source.regionOwnerMap, source.regionBorderDistanceMap)[0] ??
      [],
    ownerMap: source.regionOwnerMap,
    borderDistanceMap: source.regionBorderDistanceMap,
    dimensions,
    space,
    random: new RandomFactory(17),
    amplitudeMeters: 500,
  });
  return { forms, space, anchor };
}

function meanRadius(forms: ReturnType<typeof buildRegionForms>): number {
  return forms.reduce((sum, form) => sum + form.radiusMeters, 0) / forms.length;
}

function nominalLandShare(
  forms: ReturnType<typeof buildRegionForms>,
  dimensions: WorldDimensions
): number {
  const area = forms.reduce((sum, form) => sum + Math.PI * form.radiusMeters ** 2, 0);
  return area / (dimensions.widthMeters * dimensions.heightMeters);
}

describe('buildRegionForms', () => {
  it.each(['temperate', 'cold'] as const)('builds no atoll cavities for a %s lagoon', thermal => {
    const { forms } = regionForms(
      'lagoon',
      DIMENSIONS,
      undefined,
      regionShapeFor('lagoon', thermal, 1)
    );

    expect(forms.length).toBeGreaterThan(0);
    expect(forms.every(form => !form.hasCavity)).toBe(true);
  });

  it('keeps the base atoll recipe when coupling is zero', () => {
    const shape = regionShapeFor('lagoon', 'cold', 0);

    expect(shape.buildsReef).toBe(REGION_SHAPES.lagoon.buildsReef);
    expect(shape.cavityShare).toBe(REGION_SHAPES.lagoon.cavityShare);
  });

  it('resolves the thermal variant at each form centre', () => {
    const warm = regionShapeFor('lagoon', 'warm', 1);
    const cold = regionShapeFor('lagoon', 'cold', 1);
    const { forms } = regionForms('lagoon', DIMENSIONS, undefined, warm, point =>
      point.x < 0.3 ? cold : warm
    );

    expect(forms.some(form => form.shape.buildsReef)).toBe(true);
    expect(forms.some(form => !form.shape.buildsReef)).toBe(true);
  });

  it('keeps form centres stable when the thermal variant changes', () => {
    const warm = regionShapeFor('lagoon', 'warm', 1);
    const cold = regionShapeFor('lagoon', 'cold', 1);
    const first = regionForms('lagoon', DIMENSIONS, undefined, warm, point =>
      point.x < 0.3 ? cold : warm
    );
    const second = regionForms('lagoon', DIMENSIONS, undefined, warm, point =>
      point.x < 0.3 ? warm : cold
    );

    expect(first.forms.map(form => form.centre)).toEqual(second.forms.map(form => form.centre));
  });

  it('anchors the main form of a region near its centre', () => {
    const space = createWorldSpace(DIMENSIONS);
    const mask = new Uint8Array(CELLS);
    for (let y = 0; y < DIMENSIONS.sampleHeight; y++) {
      for (let x = 0; x < DIMENSIONS.sampleWidth; x++) {
        if (containsNormalized('disc', space.cellToNormalized(x, y))) {
          mask[y * DIMENSIONS.sampleWidth + x] = 1;
        }
      }
    }
    const { forms, anchor } = regionForms('ordinary', DIMENSIONS, mask);
    const main = forms[0];
    if (!main) {
      throw new Error('The region must build at least one form.');
    }

    // The owner border distance alone would park this form on the world rim:
    // nothing there borders another region, so the maximum sits at the edge.
    expect(space.distanceMeters(main.centre, anchor.centre)).toBeLessThan(
      0.25 * Math.sqrt(anchor.areaSquareMeters)
    );
  });

  it('shifts the summit of a plain island toward one shore', () => {
    const { forms, space } = regionForms('ordinary');

    expect(forms.length).toBeGreaterThan(0);
    for (const form of forms) {
      // A plain island carries its summit well away from the middle: the
      // type's cliff share sharpens that shore, it no longer pins the summit.
      const offset = space.distanceMeters(form.centre, form.peak) / form.radiusMeters;
      expect(offset).toBeGreaterThanOrEqual(0.25);
      expect(offset).toBeLessThanOrEqual(0.95);
    }
  });

  it('bites deep bays into plain island outlines', () => {
    const { forms } = regionForms('ordinary');
    const bays = forms.flatMap(form => form.bays.filter(bay => bay.depth > 0));

    expect(bays.length).toBeGreaterThan(0);
    for (const bay of bays) {
      expect(bay.depth).toBeGreaterThanOrEqual(0.25);
      expect(bay.depth).toBeLessThanOrEqual(0.7);
      expect(bay.width).toBeGreaterThanOrEqual(0.35);
    }
  });

  it('adds forms as the world grows instead of only scaling the same set', () => {
    const small = regionForms('ordinary', SMALL_DIMENSIONS).forms;
    const large = regionForms('ordinary', LARGE_DIMENSIONS).forms;
    const smallMean = meanRadius(small);
    const largeMean = meanRadius(large);

    expect(large.length).toBeGreaterThanOrEqual(small.length * 4);
    expect(largeMean).toBeGreaterThan(smallMean);
    expect(largeMean).toBeLessThan(smallMean * 2);
    expect(Math.max(...large.map(form => form.radiusMeters))).toBeGreaterThan(
      Math.max(...small.map(form => form.radiusMeters))
    );
    expect(
      Math.max(...large.map(form => form.radiusMeters)) /
        Math.min(...large.map(form => form.radiusMeters))
    ).toBeGreaterThan(1.5);
  });

  it('keeps the larger world deterministic for one seed and configuration', () => {
    const first = regionForms('ordinary', LARGE_DIMENSIONS).forms;
    const second = regionForms('ordinary', LARGE_DIMENSIONS).forms;

    expect(second).toEqual(first);
  });

  it('keeps the configured land share at both world sizes', () => {
    const shape = REGION_SHAPES.ordinary;
    const targetShare = shape.coverageFactor * (0.03 + 0.97 * 0.5);
    const small = regionForms('ordinary', SMALL_DIMENSIONS).forms;
    const large = regionForms('ordinary', LARGE_DIMENSIONS).forms;

    expect(nominalLandShare(small, SMALL_DIMENSIONS)).toBeCloseTo(targetShare, 2);
    expect(nominalLandShare(large, LARGE_DIMENSIONS)).toBeCloseTo(targetShare, 2);
  });

  it('derives the count from the target land area', () => {
    const low = regionForms('ordinary', SMALL_DIMENSIONS, undefined, undefined, undefined, {
      landShare: 0.2,
    }).forms;
    const high = regionForms('ordinary', SMALL_DIMENSIONS, undefined, undefined, undefined, {
      landShare: 0.8,
    }).forms;

    expect(high.length).toBeGreaterThan(low.length);
  });

  it('turns island division into fewer, larger forms', () => {
    const many = regionForms('ordinary', SMALL_DIMENSIONS, undefined, undefined, undefined, {
      concentration: 0.1,
    }).forms;
    const few = regionForms('ordinary', SMALL_DIMENSIONS, undefined, undefined, undefined, {
      concentration: 0.9,
    }).forms;

    expect(few.length).toBeLessThan(many.length);
    expect(meanRadius(few)).toBeGreaterThan(meanRadius(many));
  });

  it('does not clamp a large world to the old fourteen-form cap', () => {
    const shape = regionShapeFor('lagoon', 'cold', 1);
    const { forms } = regionForms('lagoon', LARGE_DIMENSIONS, undefined, shape);

    expect(forms.length).toBeGreaterThan(14);
  });

  it('caps custom worlds beyond the UI maximum at the safety limit', () => {
    const { forms } = regionForms('ordinary', EXTREME_DIMENSIONS);

    expect(forms).toHaveLength(128);
  });

  it('keeps caldera summits centred and free of bays', () => {
    const { forms, space } = regionForms('volcanic', FINE_DIMENSIONS);

    expect(forms.length).toBeGreaterThan(0);
    const calderas = forms.filter(form => form.hasCavity);
    expect(calderas.length).toBeGreaterThan(0);
    for (const form of forms) {
      const offset = space.distanceMeters(form.centre, form.peak) / form.radiusMeters;
      if (form.hasCavity) {
        // The crater sits on the summit, so the summit stays centred.
        expect(offset).toBeLessThanOrEqual(0.16);
        expect(form.bays.every(bay => bay.depth === 0)).toBe(true);
      } else {
        expect(offset).toBeGreaterThanOrEqual(0.25);
      }
    }
  });
});
