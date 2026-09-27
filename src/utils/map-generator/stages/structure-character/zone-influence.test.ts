import { createZoneSampler } from './zone-influence';
import type { CharacterZone, GeologicalStructure, TerrainProfile } from '../../types';

const STRUCTURE: GeologicalStructure = {
  id: 's',
  archetype: 'round',
  shelfId: 'shelf-1',
  nodes: [
    { id: 'a', position: { x: 0.4, y: 0.5 }, radius: 0.05 },
    { id: 'b', position: { x: 0.6, y: 0.5 }, radius: 0.05 },
  ],
  edges: [{ id: 'ab', from: 'a', to: 'b' }],
};

function profile(value: number): TerrainProfile {
  return {
    elevation: value,
    roughness: value,
    mountainStrength: value,
    hillStrength: value,
    plateauStrength: value,
    lakePotential: value,
    erosionStrength: value,
    coastalCliffStrength: value,
  };
}

const WHOLE: CharacterZone = {
  id: 'whole',
  structureId: 's',
  character: 'plains',
  geometry: { kind: 'whole' },
  values: profile(0),
};
const CHAIN: CharacterZone = {
  id: 'chain',
  structureId: 's',
  character: 'mountains',
  geometry: { kind: 'chain', pathId: 'main', from: 0.25, to: 0.75 },
  values: profile(1),
};

describe('createZoneSampler', () => {
  it('uses one footprint for dominant character and a smooth terrain profile', () => {
    const sampler = createZoneSampler(STRUCTURE);
    const zones = [WHOLE, CHAIN];
    const outside = { x: 0.43, y: 0.5 };
    const boundary = { x: 0.45, y: 0.5 };
    const near = { x: 0.452, y: 0.5 };
    const middle = { x: 0.5, y: 0.5 };

    expect(sampler.dominant(zones, outside)?.id).toBe('whole');
    expect(sampler.dominant(zones, near)?.id).toBe('chain');
    expect(sampler.profile(zones, boundary)?.elevation).toBeCloseTo(0);
    expect(sampler.profile(zones, near)?.elevation).toBeGreaterThan(0);
    expect(sampler.profile(zones, near)?.elevation).toBeLessThan(1);
    expect(sampler.profile(zones, middle)?.elevation).toBeCloseTo(1);
  });

  it('lets a later overlapping zone dominate and blend last', () => {
    const later: CharacterZone = {
      ...CHAIN,
      id: 'later',
      character: 'hills',
      values: profile(0.4),
      geometry: { kind: 'spine', pathId: 'main', from: 0.3, to: 0.7, share: 0.5 },
    };
    const sampler = createZoneSampler(STRUCTURE);
    const point = { x: 0.5, y: 0.5 };
    expect(sampler.dominant([WHOLE, CHAIN, later], point)?.id).toBe('later');
    expect(sampler.profile([WHOLE, CHAIN, later], point)?.elevation).toBeCloseTo(0.4);
  });
});
