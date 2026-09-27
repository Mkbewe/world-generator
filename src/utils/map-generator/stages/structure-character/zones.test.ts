import { ARCHETYPE_POOLS } from './archetype-pools';
import { buildZones } from './zones';
import { SeededRandom } from '../../random/seeded-random';
import type {
  GeologicalStructure,
  LandmassArchetype,
  StructureCharacterConfig,
  TerrainCharacter,
} from '../../types';
import { structurePaths } from '../landmass';

const CONFIG: StructureCharacterConfig = { characterVariation: 0.5, terrainBias: 0.5 };
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

/** Six-node branched structure: wide extent and enough nodes for a third zone. */
function branchedStructure(): GeologicalStructure {
  return {
    id: 'a',
    archetype: 'branched',
    nodes: [
      { id: 'a-n1', position: { x: 0.1, y: 0.5 }, radius: 0.05 },
      { id: 'a-n2', position: { x: 0.3, y: 0.5 }, radius: 0.05 },
      { id: 'a-n3', position: { x: 0.5, y: 0.5 }, radius: 0.05 },
      { id: 'a-n4', position: { x: 0.7, y: 0.5 }, radius: 0.05 },
      { id: 'a-n5', position: { x: 0.9, y: 0.5 }, radius: 0.05 },
      { id: 'a-n6', position: { x: 0.5, y: 0.2 }, radius: 0.05 },
    ],
    edges: [
      { id: 'a-e1', from: 'a-n1', to: 'a-n2' },
      { id: 'a-e2', from: 'a-n2', to: 'a-n3' },
      { id: 'a-e3', from: 'a-n3', to: 'a-n4' },
      { id: 'a-e4', from: 'a-n4', to: 'a-n5' },
      { id: 'a-e5', from: 'a-n3', to: 'a-n6' },
    ],
    shelfId: 'shelf-1',
  };
}

/** Extra zones drawn for one target over a seed pool. */
function countSplits(target: GeologicalStructure, seeds: number): number {
  let splits = 0;
  for (let seed = 1; seed <= seeds; seed++) {
    splits += buildZones([target], CONFIG, SHAPE, new SeededRandom(seed)).length - 1;
  }
  return splits;
}

/** Base characters drawn for one target at a given terrain bias. */
function countBaseCharacters(bias: number, seeds: number): Record<TerrainCharacter, number> {
  const counts: Record<TerrainCharacter, number> = { plains: 0, hills: 0, mountains: 0 };
  for (let seed = 1; seed <= seeds; seed++) {
    const zones = buildZones(
      [structure('a', 'round')],
      { characterVariation: 0, terrainBias: bias },
      SHAPE,
      new SeededRandom(seed)
    );
    counts[zones[0].character] += 1;
  }
  return counts;
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
        { characterVariation: 0, terrainBias: 0.5 },
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
      { characterVariation: 0, terrainBias: 0.5 },
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

  it('splits a small structure less often than a large one', () => {
    const small = countSplits(structure('a', 'round', 0.48, 0.5), 200);
    const large = countSplits(structure('a', 'round', 0.3, 0.7), 200);

    expect(small).toBe(0);
    expect(small).toBeLessThan(large);
  });

  it('gives a large branched structure a third zone', () => {
    let sawThird = false;
    for (let seed = 1; seed <= 100 && !sawThird; seed++) {
      const zones = buildZones([branchedStructure()], CONFIG, SHAPE, new SeededRandom(seed));
      sawThird = zones.length === 3;
    }

    expect(sawThird).toBe(true);
  });

  it('keeps repeated rim bands disjoint and on the same path', () => {
    let sawRepeatedRim = false;
    for (let seed = 1; seed <= 200; seed++) {
      const zones = buildZones([branchedStructure()], CONFIG, SHAPE, new SeededRandom(seed));
      const first = zones[1]?.geometry;
      const second = zones[2]?.geometry;
      if (first?.kind === 'rim' && second?.kind === 'rim') {
        sawRepeatedRim = true;
        expect(second.pathId).toBe(first.pathId);
        expect(second.from >= first.to || first.from >= second.to).toBe(true);
        expect(zones[2].character).toBe(zones[1].character);
        expect(zones[2].values).toEqual(zones[1].values);
      }
    }
    expect(sawRepeatedRim).toBe(true);
  });

  it('scopes path bands to existing paths and local stretches', () => {
    const target = branchedStructure();
    const pathIds = new Set(structurePaths(target).map(path => path.id));
    let sawInterior = false;
    for (let seed = 1; seed <= 200; seed++) {
      for (const zone of buildZones([target], CONFIG, SHAPE, new SeededRandom(seed))) {
        const geometry = zone.geometry;
        if (geometry.kind === 'chain' || geometry.kind === 'spine' || geometry.kind === 'rim') {
          expect(pathIds.has(geometry.pathId)).toBe(true);
          expect(geometry.from).toBeLessThan(geometry.to);
          if (geometry.from > 0 && geometry.to < 1) {
            sawInterior = true;
          }
        }
      }
    }
    expect(sawInterior).toBe(true);
  });

  it('can plan low inland terrain with higher local rims', () => {
    let sawBasin = false;
    let sawCoast = false;
    for (let seed = 1; seed <= 300; seed++) {
      const zones = buildZones([branchedStructure()], CONFIG, SHAPE, new SeededRandom(seed));
      const rim = zones.find(zone => zone.geometry.kind === 'rim');
      if (rim && zones[0].character === 'plains' && rim.character !== 'plains') {
        sawBasin = true;
      }
      if (rim && zones[0].character !== 'plains' && rim.character === 'plains') {
        sawCoast = true;
      }
    }
    expect(sawBasin).toBe(true);
    expect(sawCoast).toBe(true);
  });

  it('produces rim and point splits for the branched pool', () => {
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

    expect(seen.has('rim')).toBe(true);
    expect(seen.has('point')).toBe(true);
  });

  it('leans base characters from plains to mountains with the terrain bias', () => {
    const flat = countBaseCharacters(0, 400);
    const steep = countBaseCharacters(1, 400);

    expect(flat.mountains).toBeLessThan(steep.mountains);
    expect(flat.plains).toBeGreaterThan(steep.plains);
  });

  it('keeps a lagoon on plains regardless of the terrain bias', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const zones = buildZones(
        [structure('a', 'lagoon')],
        { characterVariation: 0.5, terrainBias: 1 },
        SHAPE,
        new SeededRandom(seed)
      );

      expect(zones[0].character).toBe('plains');
    }
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
