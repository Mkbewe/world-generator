import { createHeightmapNoiseBands, type HeightmapNoiseBands } from './bands';
import { OCEAN_DEPTH_METERS } from './defaults';
import { buildHeightField } from './field';
import type { WorldDimensions } from '../../../world-dimensions';
import { RandomFactory } from '../../random';
import { createWorldSpace } from '../../space';
import type { GeologicalAreaPlan, GeologyPlan, TerrainProfile } from '../../types';
import { buildGeologyPlan, createGeologicalArea, PROVENANCE_OUTSIDE } from '../geology';

const SIDE = 65;
const DIMENSIONS: WorldDimensions = {
  widthMeters: 2000,
  heightMeters: 2000,
  sampleWidth: SIDE,
  sampleHeight: SIDE,
};
const SPACE = createWorldSpace({ sampleWidth: SIDE, sampleHeight: SIDE });

const PROFILE: TerrainProfile = {
  elevation: 0.5,
  roughness: 0.5,
  mountainStrength: 0.5,
  hillStrength: 0.5,
  plateauStrength: 0.5,
  lakePotential: 0.5,
  erosionStrength: 0.5,
  coastalCliffStrength: 0.5,
};

function area(overrides: Partial<GeologicalAreaPlan> = {}): GeologicalAreaPlan {
  return {
    id: 'area-1',
    centre: { x: 0.5, y: 0.5 },
    extent: 0.24,
    elongation: 0.35,
    direction: 0,
    upliftDensity: 0.55,
    upliftScaleMeters: 600,
    fragmentation: 0.65,
    seabedOffsetMeters: 40,
    shelfWidthMeters: 800,
    rimStrength: 0,
    relief: 'plains',
    profile: PROFILE,
    ...overrides,
  };
}

function build(
  areas: GeologicalAreaPlan[],
  mask = new Uint8Array(SIDE * SIDE).fill(1),
  relief = 0.6
) {
  const plan: GeologyPlan = { areas };
  return buildHeightField({
    plan,
    bands: createHeightmapNoiseBands(new RandomFactory(17), DIMENSIONS),
    worldMask: mask,
    dimensions: DIMENSIONS,
    space: SPACE,
    relief,
  });
}

function at(field: Float32Array | Int16Array, x: number, y: number): number {
  return field[y * SIDE + x];
}

describe('buildHeightField', () => {
  it('is deterministic for the same input', () => {
    const first = build([area()]);
    const second = build([area()]);

    expect(second.heightmap).toEqual(first.heightmap);
    expect(second.provenanceMap).toEqual(first.provenanceMap);
  });

  it('produces finite heights and an in-range provenance', () => {
    const { heightmap, provenanceMap } = build([area()]);

    expect([...heightmap].every(Number.isFinite)).toBe(true);
    for (const value of provenanceMap) {
      expect(value).toBeGreaterThanOrEqual(PROVENANCE_OUTSIDE);
      expect(value).toBeLessThanOrEqual(0);
    }
  });

  it('keeps the sentinel outside the world mask', () => {
    const mask = new Uint8Array(SIDE * SIDE).fill(1);
    mask[20 * SIDE + 20] = 0;
    const { heightmap, provenanceMap } = build([area()], mask);

    expect(at(heightmap, 20, 20)).toBe(0);
    expect(at(provenanceMap, 20, 20)).toBe(PROVENANCE_OUTSIDE);
  });

  it('creates land and deep water without a trench under the area', () => {
    const { heightmap } = build([area()]);

    expect(at(heightmap, 32, 32)).toBeGreaterThan(-OCEAN_DEPTH_METERS);
    expect(Math.max(...heightmap)).toBeGreaterThan(0);
    expect(Math.min(...heightmap)).toBeLessThanOrEqual(-OCEAN_DEPTH_METERS);
  });

  it('fades smoothly into the ocean floor', () => {
    const { heightmap } = build([area()]);
    let maxStep = 0;

    for (let y = 0; y < SIDE; y++) {
      for (let x = 1; x < SIDE; x++) {
        maxStep = Math.max(maxStep, Math.abs(at(heightmap, x, y) - at(heightmap, x - 1, y)));
      }
    }
    expect(maxStep).toBeLessThan(80);
  });

  it('does not leave exact-datum plateaus', () => {
    const { heightmap } = build([area()]);
    const flat = [...heightmap].filter(value => Math.abs(value) < 1e-6).length;

    expect(flat / heightmap.length).toBeLessThan(0.05);
  });

  it('assigns the provenance to the covering area', () => {
    const { provenanceMap } = build([area()]);

    expect(at(provenanceMap, 32, 32)).toBe(0);
  });

  it('lifts overlapping areas above a single one', () => {
    const raised: Partial<GeologicalAreaPlan> = {
      profile: { ...PROFILE, elevation: 1 },
      upliftDensity: 1,
      seabedOffsetMeters: 0,
    };
    const single = build([area(raised)], undefined, 1);
    const double = build([area(raised), area({ ...raised, id: 'area-2' })], undefined, 1);

    expect(at(double.heightmap, 32, 32)).toBeGreaterThan(at(single.heightmap, 32, 32));
  });

  it('raises the atoll rim above its lagoon', () => {
    const { heightmap } = build([area({ rimStrength: 0.9, seabedOffsetMeters: -60 })]);
    const rimX = Math.round(32 + 0.7 * 0.24 * (SIDE - 1));

    expect(at(heightmap, rimX, 32)).toBeGreaterThan(at(heightmap, 32, 32));
  });

  it('crosses land, shallow water and the open ocean continuously', () => {
    const flat: HeightmapNoiseBands = { large: () => 0.5, medium: () => 0.5, fine: () => 0.5 };
    const { heightmap } = buildHeightField({
      plan: { areas: [area({ shelfWidthMeters: 0 })] },
      bands: flat,
      worldMask: new Uint8Array(SIDE * SIDE).fill(1),
      dimensions: DIMENSIONS,
      space: SPACE,
      relief: 1,
    });

    const fromCentre = Array.from({ length: SIDE - 32 }, (_value, step) =>
      at(heightmap, 32 + step, 32)
    );
    expect(fromCentre[0]).toBeGreaterThan(0);
    expect(fromCentre.some(value => value < 0 && value > -OCEAN_DEPTH_METERS)).toBe(true);
    expect(fromCentre.at(-1)).toBe(-OCEAN_DEPTH_METERS);
    let maxStep = 0;
    for (let step = 1; step < fromCentre.length; step++) {
      maxStep = Math.max(maxStep, Math.abs(fromCentre[step] - fromCentre[step - 1]));
    }
    expect(maxStep).toBeLessThan(40);
  });

  it('grows several separate uplifts from one area', () => {
    const wavy: HeightmapNoiseBands = {
      large: point => Math.sin(point.x * Math.PI * 12),
      medium: () => 0,
      fine: () => 0,
    };
    const { heightmap } = buildHeightField({
      plan: {
        areas: [
          area({
            profile: { ...PROFILE, elevation: 1 },
            seabedOffsetMeters: -150,
            upliftDensity: 1,
          }),
        ],
      },
      bands: wavy,
      worldMask: new Uint8Array(SIDE * SIDE).fill(1),
      dimensions: DIMENSIONS,
      space: SPACE,
      relief: 1,
    });

    let uplifts = 0;
    let onLand = false;
    for (let x = 0; x < SIDE; x++) {
      const land = at(heightmap, x, 32) > 0;
      if (land && !onLand) {
        uplifts++;
      }
      onLand = land;
    }
    expect(uplifts).toBeGreaterThanOrEqual(2);
  });

  it('rejects a plan whose areas are not ordered by id', () => {
    const plan: GeologyPlan = { areas: [area({ id: 'area-2' }), area()] };

    expect(() =>
      buildHeightField({
        plan,
        bands: createHeightmapNoiseBands(new RandomFactory(17), DIMENSIONS),
        worldMask: new Uint8Array(SIDE * SIDE).fill(1),
        dimensions: DIMENSIONS,
        space: SPACE,
        relief: 0.6,
      })
    ).toThrow('ordered by id');
  });

  it('keeps the whole world at the ocean floor for an empty plan', () => {
    const { heightmap, provenanceMap } = build([]);

    expect([...heightmap].every(value => value === -OCEAN_DEPTH_METERS)).toBe(true);
    expect([...provenanceMap].every(value => value === PROVENANCE_OUTSIDE)).toBe(true);
  });

  it('keeps the height unchanged when the config list order changes', () => {
    const first = createGeologicalArea('area-1', 'shallow-archipelago');
    const second = createGeologicalArea('area-2', 'volcanic');
    const bands = createHeightmapNoiseBands(new RandomFactory(17), DIMENSIONS);
    const forward = buildHeightField({
      plan: buildGeologyPlan({ areas: [first, second] }, new RandomFactory(17), 'rectangle'),
      bands,
      worldMask: new Uint8Array(SIDE * SIDE).fill(1),
      dimensions: DIMENSIONS,
      space: SPACE,
      relief: 0.6,
    });
    const reversed = buildHeightField({
      plan: buildGeologyPlan({ areas: [second, first] }, new RandomFactory(17), 'rectangle'),
      bands,
      worldMask: new Uint8Array(SIDE * SIDE).fill(1),
      dimensions: DIMENSIONS,
      space: SPACE,
      relief: 0.6,
    });

    expect(reversed.heightmap).toEqual(forward.heightmap);
  });

  it('stretches the influence along the axis with elongation', () => {
    const flat: HeightmapNoiseBands = { large: () => 0.5, medium: () => 0.5, fine: () => 0.5 };
    const { heightmap } = buildHeightField({
      plan: { areas: [area({ elongation: 1, upliftDensity: 1 })] },
      bands: flat,
      worldMask: new Uint8Array(SIDE * SIDE).fill(1),
      dimensions: DIMENSIONS,
      space: SPACE,
      relief: 1,
    });
    let along = 0;
    let across = 0;
    for (let step = 0; step < SIDE; step++) {
      if (at(heightmap, step, 32) > -OCEAN_DEPTH_METERS) {
        along++;
      }
      if (at(heightmap, 32, step) > -OCEAN_DEPTH_METERS) {
        across++;
      }
    }

    expect(along).toBeGreaterThan(across);
  });

  it('gives different forms for volcanic and shallow presets at the same seed', () => {
    const bands = createHeightmapNoiseBands(new RandomFactory(17), DIMENSIONS);
    const field = (preset: 'shallow-archipelago' | 'volcanic') =>
      buildHeightField({
        plan: buildGeologyPlan(
          { areas: [createGeologicalArea('area-1', preset)] },
          new RandomFactory(17),
          'rectangle'
        ),
        bands,
        worldMask: new Uint8Array(SIDE * SIDE).fill(1),
        dimensions: DIMENSIONS,
        space: SPACE,
        relief: 0.6,
      }).heightmap;

    const shallow = field('shallow-archipelago');
    const volcanic = field('volcanic');

    expect(Math.min(...volcanic)).toBeLessThan(Math.min(...shallow));
    expect(volcanic).not.toEqual(shallow);
  });

  it('damps sub-sample fine detail on coarse grids', () => {
    // The only difference in each pair is the fine band; the gate (150 m
    // wave vs 250 m cells) must shrink its footprint on the coarse grid.
    const coarse = fineFootprint(16, 4000);
    const fine = fineFootprint(64, 2000);

    expect(coarse).toBeLessThan(fine);
  });

  it('keeps the historical edge with no shelf and lifts it with one', () => {
    // Cell (51, 32) sits past the 0.24 extent but inside the 800 m apron.
    const bare = build([area({ shelfWidthMeters: 0 })]);
    const shelved = build([area({ shelfWidthMeters: 800 })]);

    expect(at(bare.heightmap, 51, 32)).toBe(-OCEAN_DEPTH_METERS);
    expect(at(shelved.heightmap, 51, 32)).toBeGreaterThan(-OCEAN_DEPTH_METERS);
    expect([...shelved.heightmap].every(Number.isFinite)).toBe(true);
  });

  it('leans small uplifts to medium forms and large ones to broad forms', () => {
    const wavy: HeightmapNoiseBands = {
      large: point => Math.sin(point.x * Math.PI * 4),
      medium: point => Math.sin(point.x * Math.PI * 20),
      fine: () => 0,
    };
    const field = (upliftScaleMeters: number) =>
      buildHeightField({
        plan: {
          areas: [
            area({
              profile: { ...PROFILE, elevation: 1 },
              seabedOffsetMeters: -150,
              upliftDensity: 1,
              upliftScaleMeters,
            }),
          ],
        },
        bands: wavy,
        worldMask: new Uint8Array(SIDE * SIDE).fill(1),
        dimensions: DIMENSIONS,
        space: SPACE,
        relief: 1,
      }).heightmap;
    const uplifts = (heightmap: Float32Array) => {
      let count = 0;
      let onLand = false;
      for (let x = 0; x < SIDE; x++) {
        const land = at(heightmap, x, 32) > 0;
        if (land && !onLand) {
          count++;
        }
        onLand = land;
      }
      return count;
    };

    // The small scale leans to the faster medium band, so it splits the same
    // area into more separate uplifts than the broad band does.
    expect(uplifts(field(100))).toBeGreaterThan(uplifts(field(4000)));
  });

  it('spreads the broad range wider with fragmentation', () => {
    const singing: HeightmapNoiseBands = {
      large: point => Math.sin(point.x * Math.PI * 12),
      medium: () => 0,
      fine: () => 0,
    };
    const field = (fragmentation: number) =>
      buildHeightField({
        plan: {
          areas: [
            area({
              profile: { ...PROFILE, elevation: 1 },
              seabedOffsetMeters: 0,
              upliftDensity: 1,
              fragmentation,
            }),
          ],
        },
        bands: singing,
        worldMask: new Uint8Array(SIDE * SIDE).fill(1),
        dimensions: DIMENSIONS,
        space: SPACE,
        relief: 1,
      }).heightmap;

    const calm = field(0);
    const broken = field(1);
    // Both fields share the same support, so the ocean floor outside it must
    // not decide the comparison; compare the covered cells instead.
    const covered = calm
      .map((value, index) => (value > -OCEAN_DEPTH_METERS ? index : -1))
      .filter(index => index >= 0);
    const coveredMin = (values: Float32Array) => Math.min(...covered.map(index => values[index]));

    expect(covered.length).toBeGreaterThan(0);
    expect(Math.max(...broken)).toBeGreaterThan(Math.max(...calm));
    expect(coveredMin(broken)).toBeLessThan(coveredMin(calm));
  });

  it('carries more detail on rough profiles than on smooth ones', () => {
    const fineWave: HeightmapNoiseBands = {
      large: () => 0.5,
      medium: () => 0.5,
      fine: point => Math.sin(point.x * Math.PI * 80),
    };
    const variation = (roughness: number) => {
      const { heightmap } = buildHeightField({
        plan: { areas: [area({ profile: { ...PROFILE, roughness } })] },
        bands: fineWave,
        worldMask: new Uint8Array(SIDE * SIDE).fill(1),
        dimensions: DIMENSIONS,
        space: SPACE,
        relief: 1,
      });
      let total = 0;
      for (let x = 1; x < SIDE; x++) {
        total += Math.abs(at(heightmap, x, 32) - at(heightmap, x - 1, 32));
      }
      return total / (SIDE - 1);
    };

    expect(variation(1)).toBeGreaterThan(variation(0));
  });
});

/** Mean per-cell impact of the fine band on one grid, in metres. */
function fineFootprint(side: number, widthMeters: number): number {
  const dimensions: WorldDimensions = {
    widthMeters,
    heightMeters: widthMeters,
    sampleWidth: side,
    sampleHeight: side,
  };
  const space = createWorldSpace({ sampleWidth: side, sampleHeight: side });
  const mask = new Uint8Array(side * side).fill(1);
  const plan: GeologyPlan = { areas: [area()] };
  const bands = createHeightmapNoiseBands(new RandomFactory(17), dimensions);
  const flat: HeightmapNoiseBands = { ...bands, fine: () => 0 };

  const withDetail = buildHeightField({
    plan,
    bands,
    worldMask: mask,
    dimensions,
    space,
    relief: 0.6,
  }).heightmap;
  const withoutDetail = buildHeightField({
    plan,
    bands: flat,
    worldMask: mask,
    dimensions,
    space,
    relief: 0.6,
  }).heightmap;

  let total = 0;
  for (let index = 0; index < withDetail.length; index++) {
    total += Math.abs(withDetail[index] - withoutDetail[index]);
  }
  return total / withDetail.length;
}
