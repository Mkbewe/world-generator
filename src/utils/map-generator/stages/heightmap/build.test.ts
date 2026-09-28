import { buildHeightmap, OUTSIDE_SHELF } from './build';
import { OCEAN_DEPTH_METERS } from './defaults';
import { createWorldSpace } from '../../space';
import type {
  CharacterZone,
  GeologicalStructure,
  HeightmapConfig,
  LandmassLayout,
  TerrainProfile,
} from '../../types';

const SPACE = createWorldSpace({ sampleWidth: 61, sampleHeight: 61 });
const CONFIG: HeightmapConfig = { relief: 0.5, featureScale: 0.5 };

const VALUES: TerrainProfile = {
  elevation: 0.7,
  roughness: 0.5,
  mountainStrength: 0.9,
  hillStrength: 0.2,
  plateauStrength: 0.1,
  lakePotential: 0.1,
  erosionStrength: 0.4,
  coastalCliffStrength: 0.2,
};

const STRUCTURE: GeologicalStructure = {
  id: 's1',
  archetype: 'round',
  nodes: [
    { id: 's1-n1', position: { x: 0.3, y: 0.5 }, radius: 0.1 },
    { id: 's1-n2', position: { x: 0.7, y: 0.5 }, radius: 0.1 },
  ],
  edges: [{ id: 's1-e1', from: 's1-n1', to: 's1-n2' }],
  shelfId: 'shelf-1',
};

const LAYOUT: LandmassLayout = {
  structures: [STRUCTURE],
  shelves: [{ id: 'shelf-1', width: 0.15, targetDepth: 60, falloff: 0.5, irregularity: 0.35 }],
};

const ZONES: CharacterZone[] = [
  {
    id: 's1-zone-1',
    structureId: 's1',
    character: 'mountains',
    geometry: { kind: 'whole' },
    values: VALUES,
  },
];

const MASK = new Uint8Array(61 * 61).fill(1);

function noiseMap(): Float32Array {
  return new Float32Array(61 * 61).fill(0.5);
}

function build(overrides: Partial<HeightmapConfig> = {}) {
  return buildHeightmap({
    layout: LAYOUT,
    zones: ZONES,
    noiseMap: noiseMap(),
    worldMask: MASK,
    config: { ...CONFIG, ...overrides },
    worldSizeMeters: 2000,
    space: SPACE,
  });
}

function at(field: Float32Array | Int16Array, x: number, y: number): number {
  return field[y * SPACE.sampleWidth + x];
}

function overlapStructure(id: string, x: number, shelfId: string): GeologicalStructure {
  return {
    id,
    archetype: 'round',
    nodes: [{ id: `${id}-n1`, position: { x, y: 0.5 }, radius: 0.05 }],
    edges: [],
    shelfId,
  };
}

function overlapField(structures: GeologicalStructure[], shelves: LandmassLayout['shelves']) {
  return buildHeightmap({
    layout: { structures, shelves },
    zones: structures.map(structure => ({
      ...ZONES[0],
      id: `${structure.id}-zone-1`,
      structureId: structure.id,
    })),
    noiseMap: noiseMap(),
    worldMask: MASK,
    config: CONFIG,
    worldSizeMeters: 2000,
    space: SPACE,
  });
}

describe('buildHeightmap', () => {
  it('raises land along the axis and keeps all values finite', () => {
    const { heightmap } = build();

    expect(at(heightmap, 30, 30)).toBeGreaterThan(0);
    expect(heightmap.every(value => Number.isFinite(value))).toBe(true);
  });

  it('fills everything beyond the shelf with the ocean floor', () => {
    const { heightmap } = build();

    expect(at(heightmap, 0, 0)).toBe(-OCEAN_DEPTH_METERS);
    expect(at(heightmap, 60, 60)).toBe(-OCEAN_DEPTH_METERS);
  });

  it('lifts the sea floor through the shelf band', () => {
    const { heightmap, shelfIndexMap } = build();
    const shelfDepths: number[] = [];
    for (let index = 0; index < shelfIndexMap.length; index++) {
      if (shelfIndexMap[index] !== OUTSIDE_SHELF) {
        shelfDepths.push(heightmap[index]);
      }
    }

    // The shelf is shallow water, so every shelf cell sits above the open ocean.
    expect(shelfDepths.length).toBeGreaterThan(0);
    const deepest = Math.min(...shelfDepths);
    expect(deepest).toBeGreaterThan(-OCEAN_DEPTH_METERS);
    expect(deepest).toBeLessThan(0);
  });

  it('leaves cells outside the world at the datum and outside any shelf', () => {
    const mask = new Uint8Array(61 * 61).fill(1);
    mask[30 * 61 + 30] = 0;
    const { heightmap, shelfIndexMap } = buildHeightmap({
      layout: LAYOUT,
      zones: ZONES,
      noiseMap: noiseMap(),
      worldMask: mask,
      config: CONFIG,
      worldSizeMeters: 2000,
      space: SPACE,
    });

    expect(at(heightmap, 30, 30)).toBe(0);
    expect(at(shelfIndexMap, 30, 30)).toBe(OUTSIDE_SHELF);
  });

  it('reaches the sea datum at the coast rather than a step', () => {
    const { heightmap } = build();
    const axis = at(heightmap, 30, 30);
    const edge = at(heightmap, 30, 24);

    expect(edge).toBeCloseTo(0, 6);
    expect(edge).toBeLessThan(axis);
    expect(at(heightmap, 30, 23)).toBeLessThan(0);
  });

  it('raises the peaks with relief', () => {
    const low = build({ relief: 0 });
    const high = build({ relief: 1 });

    expect(at(high.heightmap, 30, 30)).toBeGreaterThan(at(low.heightmap, 30, 30));
  });

  it('is deterministic for the same input', () => {
    expect(build().heightmap).toEqual(build().heightmap);
  });

  it('leaves the ocean floor where a structure carries no zones', () => {
    const { heightmap } = buildHeightmap({
      layout: LAYOUT,
      zones: [],
      noiseMap: noiseMap(),
      worldMask: MASK,
      config: CONFIG,
      worldSizeMeters: 2000,
      space: SPACE,
    });

    expect(at(heightmap, 30, 30)).toBe(-OCEAN_DEPTH_METERS);
  });

  it('keeps the higher ground where two structures overlap', () => {
    const tall: GeologicalStructure = {
      ...STRUCTURE,
      nodes: [
        { id: 's1-n1', position: { x: 0.1, y: 0.5 }, radius: 0.1 },
        { id: 's1-n2', position: { x: 0.3, y: 0.5 }, radius: 0.1 },
      ],
      edges: [{ id: 's1-e1', from: 's1-n1', to: 's1-n2' }],
    };
    const flat: GeologicalStructure = {
      ...STRUCTURE,
      id: 's2',
      nodes: [
        { id: 's2-n1', position: { x: 0.25, y: 0.5 }, radius: 0.1 },
        { id: 's2-n2', position: { x: 0.45, y: 0.5 }, radius: 0.1 },
      ],
      edges: [{ id: 's2-e1', from: 's2-n1', to: 's2-n2' }],
    };
    const flatZone: CharacterZone = {
      id: 's2-zone-1',
      structureId: 's2',
      character: 'plains',
      geometry: { kind: 'whole' },
      values: { ...VALUES, elevation: 0, mountainStrength: 0, hillStrength: 0 },
    };
    const layout: LandmassLayout = {
      structures: [tall, flat],
      shelves: LAYOUT.shelves,
    };
    const field = buildHeightmap({
      layout,
      zones: [{ ...ZONES[0], structureId: 's1' }, flatZone],
      noiseMap: noiseMap(),
      worldMask: MASK,
      config: CONFIG,
      worldSizeMeters: 2000,
      space: SPACE,
    });

    // Both structures reach the seam at x = 0.35; the mountainous one sits there
    // too, so its ground must win instead of the later, flat structure.
    const seam = at(field.heightmap, 21, 30);
    expect(at(field.heightmap, 15, 30)).toBeGreaterThan(seam);
    expect(seam).toBeGreaterThan(0);
  });

  it('joins overlapping shelves independently of structure order', () => {
    const left = overlapStructure('left', 0.35, 'shelf-1');
    const right = overlapStructure('right', 0.65, 'shelf-1');
    const shelves = [{ ...LAYOUT.shelves[0], width: 0.2 }];

    const forward = overlapField([left, right], shelves);
    const reverse = overlapField([right, left], shelves);

    expect(forward.heightmap).toEqual(reverse.heightmap);
    expect(forward.shelfIndexMap).toEqual(reverse.shelfIndexMap);
    expect(at(forward.shelfIndexMap, 32, 30)).toBe(0);
    const single = overlapField([left], shelves);
    expect(at(forward.heightmap, 30, 30)).toBeGreaterThan(at(single.heightmap, 30, 30));
    // The shared field has no dark trough or sharp crease at the meeting line.
    expect(Math.abs(at(forward.heightmap, 29, 30) - at(forward.heightmap, 30, 30))).toBeLessThan(1);
  });

  it('assigns an overlap to the shallower of two distinct shelves', () => {
    const left = overlapStructure('left', 0.35, 'shelf-1');
    const right = overlapStructure('right', 0.65, 'shelf-2');
    const shelves = [
      { ...LAYOUT.shelves[0], width: 0.2 },
      { ...LAYOUT.shelves[0], id: 'shelf-2', width: 0.2, targetDepth: 30 },
    ];

    const forward = overlapField([left, right], shelves);
    const reverse = overlapField([right, left], shelves);

    expect(forward.heightmap).toEqual(reverse.heightmap);
    expect(forward.shelfIndexMap).toEqual(reverse.shelfIndexMap);
    expect(at(forward.shelfIndexMap, 32, 30)).toBe(1);
  });
});
