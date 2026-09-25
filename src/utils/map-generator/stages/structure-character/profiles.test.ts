import { DEFAULT_STRUCTURE_CHARACTER_CONFIG } from './defaults';
import { buildProfile, buildProfiles } from './profiles';
import { PROFILE_FIELDS } from './tendencies';
import { SeededRandom } from '../../random/seeded-random';
import type { GeologicalStructure, LandmassArchetype } from '../../types';

function structure(id: string, archetype: LandmassArchetype): GeologicalStructure {
  return {
    id,
    archetype,
    nodes: [{ id: `${id}-n1`, position: { x: 0.5, y: 0.5 }, radius: 0.1 }],
    edges: [],
    shelfId: 'shelf-1',
  };
}

/** No noise, so only the archetype tendency shapes the profile. */
const FLAT = { ...DEFAULT_STRUCTURE_CHARACTER_CONFIG, profileVariation: 0 };

describe('buildProfile', () => {
  it('applies the archetype tendency before any variation', () => {
    const lagoon = buildProfile(structure('a', 'lagoon'), FLAT, new SeededRandom(1));
    const round = buildProfile(structure('b', 'round'), FLAT, new SeededRandom(1));
    const elongated = buildProfile(structure('c', 'elongated'), FLAT, new SeededRandom(1));

    expect(lagoon.lakePotential).toBeGreaterThan(round.lakePotential);
    expect(elongated.mountainStrength).toBeGreaterThan(round.mountainStrength);
  });

  it('keeps every value within 0..1', () => {
    const profile = buildProfile(
      structure('a', 'irregular'),
      DEFAULT_STRUCTURE_CHARACTER_CONFIG,
      new SeededRandom(7)
    );

    for (const field of PROFILE_FIELDS) {
      expect(profile[field]).toBeGreaterThanOrEqual(0);
      expect(profile[field]).toBeLessThanOrEqual(1);
    }
  });

  it('is deterministic for a seed and varies with it', () => {
    const first = buildProfile(
      structure('a', 'irregular'),
      DEFAULT_STRUCTURE_CHARACTER_CONFIG,
      new SeededRandom(3)
    );
    const again = buildProfile(
      structure('a', 'irregular'),
      DEFAULT_STRUCTURE_CHARACTER_CONFIG,
      new SeededRandom(3)
    );
    const other = buildProfile(
      structure('a', 'irregular'),
      DEFAULT_STRUCTURE_CHARACTER_CONFIG,
      new SeededRandom(4)
    );

    expect(again).toEqual(first);
    expect(other).not.toEqual(first);
  });

  it('equals the archetype tendency when the variation is zero', () => {
    const first = buildProfile(structure('a', 'lagoon'), FLAT, new SeededRandom(1));
    const second = buildProfile(structure('b', 'lagoon'), FLAT, new SeededRandom(99));

    expect(second).toEqual({ ...first, structureId: 'b' });
  });
});

describe('buildProfiles', () => {
  it('returns one profile per structure, in the layout order', () => {
    const structures = [structure('a', 'round'), structure('b', 'branched')];

    const profiles = buildProfiles(
      structures,
      DEFAULT_STRUCTURE_CHARACTER_CONFIG,
      new SeededRandom(2)
    );

    expect(profiles.map(profile => profile.structureId)).toEqual(['a', 'b']);
  });
});
