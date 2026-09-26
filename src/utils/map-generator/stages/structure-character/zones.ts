import {
  ARCHETYPE_POOLS,
  type ArchetypePool,
  secondaryChoices,
  type SplitWeight,
  type ZoneSplit,
} from './archetype-pools';
import { CHARACTER_RANGES, type CharacterRanges, sampleRange } from './character-ranges';
import { MAX_CENTER_FRACTION, MIN_CENTER_FRACTION, ZONE_EXTENT_THRESHOLD } from './defaults';
import { containsWorld, type WorldShape } from '../../../world-shape';
import type { SeededRandom } from '../../random/seeded-random';
import type {
  CharacterZone,
  GeologicalStructure,
  StructureCharacterConfig,
  TerrainCharacter,
  TerrainProfile,
  WorldPoint,
  ZoneGeometry,
} from '../../types';
import { structureExtent } from '../landmass';

/** Smallest and largest edge band width, as a fraction of the structure span. */
const MIN_EDGE_FRACTION = 0.15;
const MAX_EDGE_FRACTION = 0.3;
/** Smallest and largest point influence radius, in normalized units. */
const MIN_POINT_RADIUS = 0.12;
const MAX_POINT_RADIUS = 0.3;

/**
 * Assigns one character zone per structure plus an optional second zone on a
 * large structure. Every zone carries the field values sampled from its
 * character's ranges, so two plains islands differ. It produces definitions
 * only — no raster and no heights.
 */
export function buildZones(
  structures: readonly GeologicalStructure[],
  config: StructureCharacterConfig,
  shape: WorldShape,
  random: SeededRandom
): CharacterZone[] {
  return structures.flatMap(structure => structureZones(structure, config, shape, random));
}

function structureZones(
  structure: GeologicalStructure,
  config: StructureCharacterConfig,
  shape: WorldShape,
  random: SeededRandom
): CharacterZone[] {
  const pool = ARCHETYPE_POOLS[structure.archetype];
  const primary = pickCharacter(pool, random);
  const zones: CharacterZone[] = [
    {
      id: `${structure.id}-zone-1`,
      structureId: structure.id,
      character: primary,
      geometry: { kind: 'whole' },
      values: sampleValues(rangesFor(pool, primary), random),
    },
  ];

  if (
    structureExtent(structure) < ZONE_EXTENT_THRESHOLD ||
    !random.chance(config.characterVariation)
  ) {
    return zones;
  }
  const split = pickSplit(pool.splits, random);
  if (split === 'none') {
    return zones;
  }
  const secondary = pickOtherCharacter(pool, primary, split, random);
  zones.push({
    id: `${structure.id}-zone-2`,
    structureId: structure.id,
    character: secondary,
    geometry: splitGeometry(split, pool, structure, shape, random),
    values: sampleValues(rangesFor(pool, secondary), random),
  });
  return zones;
}

/** A pool may override the ranges; otherwise the character's own ranges apply. */
function rangesFor(pool: ArchetypePool, character: TerrainCharacter): CharacterRanges {
  return pool.ranges ?? CHARACTER_RANGES[character];
}

/** Draws one value per field, in a fixed order, so a seed stays deterministic. */
function sampleValues(ranges: CharacterRanges, random: SeededRandom): TerrainProfile {
  return {
    elevation: sampleRange(ranges.elevation, random.next()),
    roughness: sampleRange(ranges.roughness, random.next()),
    mountainStrength: sampleRange(ranges.mountainStrength, random.next()),
    hillStrength: sampleRange(ranges.hillStrength, random.next()),
    plateauStrength: sampleRange(ranges.plateauStrength, random.next()),
    lakePotential: sampleRange(ranges.lakePotential, random.next()),
    erosionStrength: sampleRange(ranges.erosionStrength, random.next()),
    coastalCliffStrength: sampleRange(ranges.coastalCliffStrength, random.next()),
  };
}

/** Characters are drawn uniformly from the archetype pool. */
function pickCharacter(pool: ArchetypePool, random: SeededRandom): TerrainCharacter {
  if (pool.characters.length === 0) {
    throw new Error('An archetype pool needs at least one character.');
  }
  return pool.characters[random.nextInteger(0, pool.characters.length - 1)];
}

/** Second zone keeps a different character; the pool orders the preference. */
function pickOtherCharacter(
  pool: ArchetypePool,
  primary: TerrainCharacter,
  split: ZoneSplit,
  random: SeededRandom
): TerrainCharacter {
  const choices = secondaryChoices(pool, primary, split);
  if (choices.length === 0) {
    return primary;
  }
  return choices[random.nextInteger(0, choices.length - 1)];
}

function pickSplit(splits: readonly SplitWeight[], random: SeededRandom): ZoneSplit {
  const total = splits.reduce((sum, entry) => sum + entry.weight, 0);
  if (total <= 0) {
    return 'none';
  }
  let roll = random.next() * total;
  for (const entry of splits) {
    roll -= entry.weight;
    if (roll < 0) {
      return entry.split;
    }
  }
  return splits[splits.length - 1].split;
}

function splitGeometry(
  split: Exclude<ZoneSplit, 'none'>,
  pool: ArchetypePool,
  structure: GeologicalStructure,
  shape: WorldShape,
  random: SeededRandom
): ZoneGeometry {
  if (split === 'center') {
    return {
      kind: 'center',
      radiusFraction:
        MIN_CENTER_FRACTION + random.next() * (MAX_CENTER_FRACTION - MIN_CENTER_FRACTION),
    };
  }
  if (split === 'edge') {
    return {
      kind: 'edge',
      widthFraction: MIN_EDGE_FRACTION + random.next() * (MAX_EDGE_FRACTION - MIN_EDGE_FRACTION),
    };
  }
  if (split === 'point') {
    return splitPoint(structure, shape, random);
  }
  return {
    kind: 'half',
    axis: splitAxis(pool, random),
    side: random.chance(0.5) ? 'low' : 'high',
  };
}

/** A point split anchors on a node that already lies inside the world. */
function splitPoint(
  structure: GeologicalStructure,
  shape: WorldShape,
  random: SeededRandom
): ZoneGeometry {
  const inside = structure.nodes.filter(node => insideShape(shape, node.position));
  if (inside.length === 0) {
    return { kind: 'center', radiusFraction: (MIN_CENTER_FRACTION + MAX_CENTER_FRACTION) / 2 };
  }
  const node = inside[random.nextInteger(0, inside.length - 1)];
  return {
    kind: 'point',
    center: node.position,
    influenceRadius: MIN_POINT_RADIUS + random.next() * (MAX_POINT_RADIUS - MIN_POINT_RADIUS),
  };
}

function splitAxis(pool: ArchetypePool, random: SeededRandom): 'along' | 'x' | 'y' {
  return pool.splitAxis ?? (random.chance(0.5) ? 'x' : 'y');
}

function insideShape(shape: WorldShape, point: WorldPoint): boolean {
  return containsWorld(shape, 2 * point.x - 1, 2 * point.y - 1);
}
