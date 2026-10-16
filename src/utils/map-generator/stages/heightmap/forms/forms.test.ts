import { buildRegionForms, collectRegionInteriors } from './forms';
import type { WorldDimensions } from '../../../../world-dimensions';
import { containsNormalized } from '../../../../world-shape';
import { RandomFactory } from '../../../random';
import { createWorldSpace } from '../../../space';
import type {
  GeologicalRegionPlan,
  GeologicalRegionType,
  GeologyPlan,
  RegionTerrainConfig,
} from '../../../types';

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

const CELLS = DIMENSIONS.sampleWidth * DIMENSIONS.sampleHeight;

function region(index: number, type: GeologicalRegionType): GeologicalRegionPlan {
  return {
    id: `region-${index + 1}`,
    type,
    centre: { x: (index + 0.5) / 2, y: 0.5 },
    weight: 1,
    areaSquareMeters: DIMENSIONS.widthMeters * DIMENSIONS.heightMeters,
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
  mask?: Uint8Array
): {
  readonly forms: ReturnType<typeof buildRegionForms>;
  readonly space: ReturnType<typeof createWorldSpace>;
  readonly anchor: GeologicalRegionPlan;
} {
  const space = createWorldSpace(dimensions);
  const source = plan([region(0, type)], mask, dimensions);
  const anchor = source.regions[0];
  if (!anchor) {
    throw new Error('The plan must carry the region.');
  }
  const forms = buildRegionForms({
    regionIndex: 0,
    region: anchor,
    terrain: terrain(),
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

describe('buildRegionForms', () => {
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
      // Every plain island bites deep bays into its outline.
      const bays = form.bays.filter(bay => bay.depth > 0);
      expect(bays.length).toBeGreaterThanOrEqual(1);
      for (const bay of bays) {
        expect(bay.depth).toBeGreaterThanOrEqual(0.25);
        expect(bay.depth).toBeLessThanOrEqual(0.7);
        expect(bay.width).toBeGreaterThanOrEqual(0.35);
      }
    }
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
        expect(form.bays.some(bay => bay.depth > 0)).toBe(true);
      }
    }
  });
});
