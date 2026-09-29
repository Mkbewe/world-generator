import { analyzeLand } from './land-components';
import type { WorldDimensions } from '../../world-dimensions';
import type { GeologicalAreaPlan, TerrainProfile } from '../types';

const SIDE = 8;
const DIMENSIONS: WorldDimensions = {
  widthMeters: 80,
  heightMeters: 80,
  sampleWidth: SIDE,
  sampleHeight: SIDE,
};

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

function planArea(id: string): GeologicalAreaPlan {
  return {
    id,
    character: 'ordinary',
    centre: { x: 0.5, y: 0.5 },
    extent: 0.18,
    elongation: 0,
    direction: 0,
    upliftDensity: 0.5,
    upliftScaleMeters: 600,
    fragmentation: 0.4,
    seabedOffsetMeters: 0,
    shelfWidthMeters: 0,
    rimStrength: 0,
    reefSites: [],
    relief: 'plains',
    profile: PROFILE,
  };
}

function field(): { heightmap: Float32Array; provenanceMap: Int16Array; worldMask: Uint8Array } {
  return {
    heightmap: new Float32Array(SIDE * SIDE),
    provenanceMap: new Int16Array(SIDE * SIDE).fill(-1),
    worldMask: new Uint8Array(SIDE * SIDE).fill(1),
  };
}

function cell(x: number, y: number): number {
  return y * SIDE + x;
}

function analyze(
  heightmap: Float32Array,
  provenanceMap: Int16Array,
  worldMask: Uint8Array,
  areas: readonly GeologicalAreaPlan[] = [planArea('a'), planArea('b')]
): ReturnType<typeof analyzeLand> {
  return analyzeLand({
    heightmap,
    provenanceMap,
    worldMask,
    dimensions: DIMENSIONS,
    plan: { areas },
  });
}

describe('analyzeLand', () => {
  it('labels separate land components and their areas', () => {
    const { heightmap, provenanceMap, worldMask } = field();
    heightmap[cell(1, 1)] = 10;
    heightmap[cell(2, 1)] = 10;
    provenanceMap[cell(1, 1)] = 0;
    provenanceMap[cell(2, 1)] = 0;
    heightmap[cell(6, 6)] = 20;
    provenanceMap[cell(6, 6)] = 1;

    const result = analyze(heightmap, provenanceMap, worldMask);

    expect(result.components).toHaveLength(2);
    expect(result.components[0]).toMatchObject({
      cells: 2,
      areaIds: ['a'],
      widthMeters: 10,
      touchesEdge: false,
    });
    expect(result.components[1]).toMatchObject({ cells: 1, areaIds: ['b'], widthMeters: 10 });
    expect(result.byArea.get('a')).toEqual({ components: 1, landCells: 2 });
    expect(result.byArea.get('b')).toEqual({ components: 1, landCells: 1 });
    expect(result.landCells).toBe(3);
    expect(result.landShare).toBeCloseTo(3 / 64);
  });

  it('measures the thickness of a solid block, not its bounding box', () => {
    const { heightmap, provenanceMap, worldMask } = field();
    for (let y = 2; y <= 4; y++) {
      for (let x = 2; x <= 4; x++) {
        heightmap[cell(x, y)] = 10;
        provenanceMap[cell(x, y)] = 0;
      }
    }

    const result = analyze(heightmap, provenanceMap, worldMask);

    expect(result.components[0]).toMatchObject({ cells: 9, widthMeters: 30 });
  });

  it('associates one island with every contributing area', () => {
    const { heightmap, provenanceMap, worldMask } = field();
    heightmap[cell(3, 3)] = 10;
    heightmap[cell(4, 3)] = 10;
    provenanceMap[cell(3, 3)] = 0;
    provenanceMap[cell(4, 3)] = 1;

    const result = analyze(heightmap, provenanceMap, worldMask);

    expect(result.components).toHaveLength(1);
    expect(result.components[0].areaIds).toEqual(['a', 'b']);
    expect(result.byArea.get('a')?.components).toBe(1);
    expect(result.byArea.get('b')?.components).toBe(1);
  });

  it('keeps areas without land and cells without provenance out of the counts', () => {
    const { heightmap, provenanceMap, worldMask } = field();
    heightmap[cell(5, 5)] = 10;

    const result = analyze(heightmap, provenanceMap, worldMask);

    expect(result.components[0].areaIds).toEqual([]);
    expect(result.byArea.get('a')).toEqual({ components: 0, landCells: 0 });
    expect(result.byArea.get('b')).toEqual({ components: 0, landCells: 0 });
  });

  it('flags components touching the world edge', () => {
    const { heightmap, provenanceMap, worldMask } = field();
    heightmap[cell(0, 0)] = 10;

    const result = analyze(heightmap, provenanceMap, worldMask);

    expect(result.components[0].touchesEdge).toBe(true);
  });

  it('measures the largest step and the height range inside the mask', () => {
    const { heightmap, provenanceMap, worldMask } = field();
    heightmap[cell(1, 1)] = 10;
    heightmap[cell(2, 1)] = 25;
    heightmap[cell(3, 1)] = 25;
    worldMask[cell(6, 6)] = 0;
    heightmap[cell(6, 6)] = 900;

    const result = analyze(heightmap, provenanceMap, worldMask);

    // The largest step is the coast drop from 25 m to the sea floor, not the 15 m inland step.
    expect(result.maxStepMeters).toBe(25);
    expect(result.maxHeight).toBe(25);
    expect(result.landShare).toBeCloseTo(3 / 63);
  });

  it('rejects rasters that do not match the dimensions', () => {
    const { heightmap, provenanceMap, worldMask } = field();
    const broken = new Float32Array(3);

    expect(() =>
      analyzeLand({
        heightmap: broken,
        provenanceMap,
        worldMask,
        dimensions: DIMENSIONS,
        plan: { areas: [] },
      })
    ).toThrow('raster size');
    expect(() => analyze(heightmap, provenanceMap, new Uint8Array(3))).toThrow('raster size');
  });
});
