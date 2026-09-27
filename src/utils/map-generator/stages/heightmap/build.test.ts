import { buildHeightmap } from './build';
import { OCEAN_DEPTH_METERS } from './defaults';
import { createWorldSpace } from '../../space';
import type {
  CharacterZone,
  GeologicalStructure,
  HeightmapConfig,
  TerrainProfile,
} from '../../types';

const SPACE = createWorldSpace({ sampleWidth: 21, sampleHeight: 21 });
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

const ZONES: CharacterZone[] = [
  {
    id: 's1-zone-1',
    structureId: 's1',
    character: 'mountains',
    geometry: { kind: 'whole' },
    values: VALUES,
  },
];

function noiseMap(): Float32Array {
  return new Float32Array(21 * 21).fill(0.5);
}

function build(overrides: Partial<HeightmapConfig> = {}): Float32Array {
  return buildHeightmap({
    structures: [STRUCTURE],
    zones: ZONES,
    noiseMap: noiseMap(),
    config: { ...CONFIG, ...overrides },
    worldSizeMeters: 2000,
    space: SPACE,
  });
}

function at(field: Float32Array, x: number, y: number): number {
  return field[y * SPACE.sampleWidth + x];
}

describe('buildHeightmap', () => {
  it('raises land along the axis and keeps all values finite', () => {
    const field = build();

    expect(at(field, 10, 10)).toBeGreaterThan(0);
    expect(field.every(value => Number.isFinite(value))).toBe(true);
  });

  it('fills everything outside the structure width with the ocean floor', () => {
    const field = build();

    expect(at(field, 0, 0)).toBe(-OCEAN_DEPTH_METERS);
    expect(at(field, 20, 20)).toBe(-OCEAN_DEPTH_METERS);
  });

  it('reaches the sea datum at the coast rather than a step', () => {
    const field = build();
    const axis = at(field, 10, 10);
    let edge = axis;
    for (let y = 10; y >= 0; y--) {
      if (at(field, 10, y) === -OCEAN_DEPTH_METERS) {
        break;
      }
      edge = at(field, 10, y);
    }

    expect(edge).toBeGreaterThan(0);
    expect(edge).toBeLessThan(axis);
  });

  it('raises the peaks with relief', () => {
    const low = build({ relief: 0 });
    const high = build({ relief: 1 });

    expect(at(high, 10, 10)).toBeGreaterThan(at(low, 10, 10));
  });

  it('is deterministic for the same input', () => {
    expect(build()).toEqual(build());
  });

  it('leaves the ocean floor where a structure carries no zones', () => {
    const field = buildHeightmap({
      structures: [STRUCTURE],
      zones: [],
      noiseMap: noiseMap(),
      config: CONFIG,
      worldSizeMeters: 2000,
      space: SPACE,
    });

    expect(at(field, 10, 10)).toBe(-OCEAN_DEPTH_METERS);
  });

  it('keeps the higher ground where two structures overlap', () => {
    const other: GeologicalStructure = {
      ...STRUCTURE,
      id: 's2',
      nodes: [
        { id: 's2-n1', position: { x: 0.4, y: 0.5 }, radius: 0.1 },
        { id: 's2-n2', position: { x: 0.6, y: 0.5 }, radius: 0.1 },
      ],
      edges: [{ id: 's2-e1', from: 's2-n1', to: 's2-n2' }],
    };
    const flat: CharacterZone = {
      id: 's2-zone-1',
      structureId: 's2',
      character: 'plains',
      geometry: { kind: 'whole' },
      values: { ...VALUES, elevation: 0, mountainStrength: 0, hillStrength: 0 },
    };
    const overlapping = buildHeightmap({
      structures: [STRUCTURE, other],
      zones: [...ZONES, flat],
      noiseMap: noiseMap(),
      config: CONFIG,
      worldSizeMeters: 2000,
      space: SPACE,
    });
    const tallOnly = buildHeightmap({
      structures: [STRUCTURE],
      zones: ZONES,
      noiseMap: noiseMap(),
      config: CONFIG,
      worldSizeMeters: 2000,
      space: SPACE,
    });

    // A flat structure on top must not lower the mountainous one underneath.
    expect(at(overlapping, 10, 10)).toBeGreaterThan(0);
    expect(at(overlapping, 10, 10)).toBe(at(tallOnly, 10, 10));
  });
});
