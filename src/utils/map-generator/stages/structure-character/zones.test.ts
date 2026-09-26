import { ARCHETYPE_POOLS } from './archetype-pools';
import { buildZones } from './zones';
import { SeededRandom } from '../../random/seeded-random';
import type { GeologicalStructure, LandmassArchetype, StructureCharacterConfig } from '../../types';

const CONFIG: StructureCharacterConfig = { characterVariation: 0.5 };
const SHAPE = 'disc' as const;

/** Two-node structure; the nodes decide its extent. */
function structure(
  id: string,
  archetype: LandmassArchetype,
  from = 0.3,
  to = 0.7
): GeologicalStructure {
  return {
    id,
    archetype,
    nodes: [
      { id: `${id}-n1`, position: { x: from, y: 0.5 }, radius: 0.05 },
      { id: `${id}-n2`, position: { x: to, y: 0.5 }, radius: 0.05 },
    ],
    edges: [{ id: `${id}-e1`, from: `${id}-n1`, to: `${id}-n2` }],
    shelfId: 'shelf-1',
  };
}

describe('buildZones', () => {
  it('gives every structure a whole zone', () => {
    const zones = buildZones([structure('a', 'round')], CONFIG, SHAPE, new SeededRandom(1));

    expect(zones.filter(zone => zone.geometry.kind === 'whole')).toHaveLength(1);
  });

  it('keeps a lagoon on plains only and never splits', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const zones = buildZones([structure('a', 'lagoon')], CONFIG, SHAPE, new SeededRandom(seed));

      expect(zones).toHaveLength(1);
      expect(zones[0].character).toBe('plains');
    }
  });

  it('keeps every structure single-character at zero variation', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const zones = buildZones(
        [structure('a', 'round')],
        { characterVariation: 0 },
        SHAPE,
        new SeededRandom(seed)
      );

      expect(zones).toHaveLength(1);
      expect(zones[0].geometry.kind).toBe('whole');
    }
  });

  it('samples normalized values for every zone', () => {
    const zones = buildZones(
      [structure('a', 'round')],
      { characterVariation: 0 },
      SHAPE,
      new SeededRandom(4)
    );

    expect(zones.length).toBeGreaterThan(0);
    for (const zone of zones) {
      for (const value of Object.values(zone.values)) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
  });

  it('splits a large structure into a second zone', () => {
    let sawSplit = false;
    for (let seed = 1; seed <= 50 && !sawSplit; seed++) {
      const zones = buildZones([structure('a', 'round')], CONFIG, SHAPE, new SeededRandom(seed));
      sawSplit = zones.some(zone => zone.geometry.kind !== 'whole');
    }

    expect(sawSplit).toBe(true);
  });

  it('produces edge and point splits for the branched pool', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200; seed++) {
      for (const zone of buildZones(
        [structure('a', 'branched')],
        CONFIG,
        SHAPE,
        new SeededRandom(seed)
      )) {
        seen.add(zone.geometry.kind);
      }
    }

    expect(seen.has('edge')).toBe(true);
    expect(seen.has('point')).toBe(true);
  });

  it('draws characters only from the archetype pool', () => {
    const pool = ARCHETYPE_POOLS.round.characters;
    for (let seed = 1; seed <= 30; seed++) {
      const zones = buildZones([structure('a', 'round')], CONFIG, SHAPE, new SeededRandom(seed));
      for (const zone of zones) {
        expect(pool).toContain(zone.character);
      }
    }
  });

  it('is deterministic for the same seed', () => {
    const first = buildZones([structure('a', 'branched')], CONFIG, SHAPE, new SeededRandom(9));
    const second = buildZones([structure('a', 'branched')], CONFIG, SHAPE, new SeededRandom(9));

    expect(second).toEqual(first);
  });
});
