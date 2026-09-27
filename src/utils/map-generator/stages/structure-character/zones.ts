import {
  ARCHETYPE_POOLS,
  type ArchetypePool,
  type TerrainLayout,
  type ZoneIntent,
  type ZoneSplit,
} from './archetype-pools';
import { CHARACTER_RANGES, type CharacterRanges, sampleRange } from './character-ranges';
import { BALANCED_TERRAIN_BIAS, FULL_SPLIT_EXTENT, ZONE_EXTENT_THRESHOLD } from './defaults';
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
import { structureExtent, type StructurePath, structurePaths } from '../landmass';

/** An additional zone must be long enough to matter at world scale. */
const MIN_ZONE_LENGTH = 0.012;
const MIN_PATH_LENGTH = 0.025;
const ZONE_GAP_FRACTION = 0.05;
const MIN_SPINE_SHARE = 0.4;
const MAX_SPINE_SHARE = 0.6;
const MIN_RIM_SHARE = 0.25;
const MAX_RIM_SHARE = 0.45;
const MIN_POINT_RADIUS = 0.12;
const MAX_POINT_RADIUS = 0.3;

/** Builds terrain intents, without raster cells or renderer dependencies. */
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
  const paths = structurePaths(structure);
  const viable = pool.layouts.filter(
    layout => layout.zones.length === 0 || canPlace(layout.zones[0], paths, structure, shape)
  );
  const layout = pickLayout(viable, random);
  const primary = pickCharacter(layout.base, undefined, random, config.terrainBias);
  const zones: CharacterZone[] = [makeZone(structure, pool, primary, { kind: 'whole' }, random, 1)];
  const budget = splitBudget(structure, paths, config);
  const first = layout.zones[0];
  if (!first || budget.first <= 0 || !random.chance(budget.first)) {
    return zones;
  }
  const firstGeometry = makeGeometry(first, paths, structure, shape, random);
  const firstCharacter = pickCharacter(first.characters, primary, random, config.terrainBias);
  zones.push(makeZone(structure, pool, firstCharacter, firstGeometry, random, 2));

  const second = layout.zones[1];
  if (!second || budget.second <= 0 || !random.chance(budget.second)) {
    return zones;
  }
  const secondGeometry = makeAdditionalGeometry(
    second,
    paths,
    structure,
    shape,
    random,
    firstGeometry
  );
  if (!secondGeometry) {
    return zones;
  }
  const secondCharacter = second.repeatPrevious
    ? firstCharacter
    : pickCharacter(second.characters, primary, random, config.terrainBias, firstCharacter);
  zones.push(
    makeZone(
      structure,
      pool,
      secondCharacter,
      secondGeometry,
      random,
      3,
      second.repeatPrevious ? zones[1].values : undefined
    )
  );
  return zones;
}

interface SplitBudget {
  readonly first: number;
  readonly second: number;
}

/** Size, usable ridge length, width and arm count all contribute to zone count. */
function splitBudget(
  structure: GeologicalStructure,
  paths: readonly StructurePath[],
  config: StructureCharacterConfig
): SplitBudget {
  const extent = structureExtent(structure);
  const usable = paths.filter(path => path.length >= MIN_PATH_LENGTH);
  if (config.characterVariation === 0 || extent < ZONE_EXTENT_THRESHOLD || usable.length === 0) {
    return { first: 0, second: 0 };
  }
  const length = usable.reduce((sum, path) => sum + path.length, 0);
  const width =
    usable.reduce(
      (sum, path) =>
        sum +
        path.segments.reduce(
          (total, segment) =>
            total + (segmentLength(segment) * (segment.fromRadius + segment.toRadius)) / 2,
          0
        ),
      0
    ) / length;
  const arms = Math.max(0, usable.length - 1);
  const complexity =
    0.35 * clamp01(extent / FULL_SPLIT_EXTENT) +
    0.35 * clamp01(length / 0.45) +
    0.2 * clamp01(width / 0.1) +
    0.1 * clamp01(arms / 2);
  const variationFactor = clamp01(config.characterVariation / 0.2);
  return {
    first: variationFactor * clamp01(0.3 + 0.15 * config.characterVariation + 0.85 * complexity),
    second: variationFactor * clamp01((complexity - 0.45) * 1.1 + 0.2 * clamp01(arms / 2)),
  };
}

function canPlace(
  intent: ZoneIntent,
  paths: readonly StructurePath[],
  structure: GeologicalStructure,
  shape: WorldShape
): boolean {
  return intent.split === 'point'
    ? structure.nodes.some(node => insideShape(shape, node.position))
    : paths.some(path => path.length >= MIN_PATH_LENGTH);
}

function pickLayout(layouts: readonly TerrainLayout[], random: SeededRandom): TerrainLayout {
  const total = layouts.reduce((sum, layout) => sum + layout.weight, 0);
  if (total <= 0) {
    throw new Error('An archetype needs a weighted terrain layout.');
  }
  let roll = random.next() * total;
  for (const layout of layouts) {
    roll -= layout.weight;
    if (roll < 0) {
      return layout;
    }
  }
  return layouts[layouts.length - 1];
}

/** How strongly the terrain bias leans between plains and mountains. */
const LEAN_WEIGHT = 0.8;

/**
 * Draws a character different from the base (and previous one where possible).
 * The terrain bias reweights the remaining choices: plains lose weight towards
 * `mountains` as the bias rises, and gain it as the bias falls; `hills` stay
 * neutral. Only the characters an archetype allows take part.
 */
function pickCharacter(
  choices: readonly TerrainCharacter[],
  primary: TerrainCharacter | undefined,
  random: SeededRandom,
  bias: number,
  previous?: TerrainCharacter
): TerrainCharacter {
  const different = choices.filter(choice => choice !== primary && choice !== previous);
  const allowed = different.length > 0 ? different : choices.filter(choice => choice !== primary);
  const pool = allowed.length > 0 ? allowed : choices;
  if (pool.length === 0) {
    throw new Error('A terrain layout needs a character choice.');
  }
  return weightedCharacter(pool, bias, random);
}

/** Picks one character with weights leaning on the flat-mountain axis. */
function weightedCharacter(
  choices: readonly TerrainCharacter[],
  bias: number,
  random: SeededRandom
): TerrainCharacter {
  const lean = (bias - BALANCED_TERRAIN_BIAS) * 2;
  const weights = choices.map(character => {
    if (character === 'mountains') {
      return 1 + LEAN_WEIGHT * lean;
    }
    if (character === 'plains') {
      return 1 - LEAN_WEIGHT * lean;
    }
    return 1;
  });
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = random.next() * total;
  for (let index = 0; index < choices.length; index++) {
    roll -= weights[index];
    if (roll < 0) {
      return choices[index];
    }
  }
  return choices[choices.length - 1];
}

function makeZone(
  structure: GeologicalStructure,
  pool: ArchetypePool,
  character: TerrainCharacter,
  geometry: ZoneGeometry,
  random: SeededRandom,
  index: number,
  values?: TerrainProfile
): CharacterZone {
  return {
    id: `${structure.id}-zone-${index}`,
    structureId: structure.id,
    character,
    geometry,
    values: values ?? sampleValues(pool.ranges ?? CHARACTER_RANGES[character], random),
  };
}

function makeGeometry(
  intent: ZoneIntent,
  paths: readonly StructurePath[],
  structure: GeologicalStructure,
  shape: WorldShape,
  random: SeededRandom
): ZoneGeometry {
  if (intent.split === 'point') {
    const nodes = structure.nodes.filter(node => insideShape(shape, node.position));
    const node = nodes[random.nextInteger(0, nodes.length - 1)];
    return {
      kind: 'point',
      center: node.position,
      influenceRadius: draw(MIN_POINT_RADIUS, MAX_POINT_RADIUS, random),
    };
  }
  const path = pickPath(paths, random);
  const length = drawSpanLength(path, intent.split, random);
  const from = draw(0, 1 - length, random);
  return pathGeometry(intent.split, path.id, from, from + length, random);
}

/** Repeated strips retain their character and leave a real gap on one path. */
function makeAdditionalGeometry(
  intent: ZoneIntent,
  paths: readonly StructurePath[],
  structure: GeologicalStructure,
  shape: WorldShape,
  random: SeededRandom,
  previous: ZoneGeometry
): ZoneGeometry | undefined {
  if (!intent.repeatPrevious) {
    return canPlace(intent, paths, structure, shape)
      ? makeGeometry(intent, paths, structure, shape, random)
      : undefined;
  }
  if (intent.split === 'point' || previous.kind !== intent.split) {
    return undefined;
  }
  const path = paths.find(entry => entry.id === previous.pathId);
  if (!path) {
    return undefined;
  }
  const leftGap = previous.from;
  const rightGap = 1 - previous.to;
  const left = leftGap >= rightGap;
  const available = (left ? leftGap : rightGap) - ZONE_GAP_FRACTION;
  if (available * path.length < MIN_ZONE_LENGTH) {
    return undefined;
  }
  const length = Math.min(drawSpanLength(path, intent.split, random), available);
  const from = left ? 0 : previous.to + ZONE_GAP_FRACTION;
  return pathGeometry(intent.split, path.id, from, from + length, random);
}

function pathGeometry(
  split: Exclude<ZoneSplit, 'point'>,
  pathId: string,
  from: number,
  to: number,
  random: SeededRandom
): ZoneGeometry {
  if (split === 'spine') {
    return {
      kind: 'spine',
      pathId,
      from,
      to,
      share: draw(MIN_SPINE_SHARE, MAX_SPINE_SHARE, random),
    };
  }
  if (split === 'rim') {
    return { kind: 'rim', pathId, from, to, share: draw(MIN_RIM_SHARE, MAX_RIM_SHARE, random) };
  }
  return { kind: 'chain', pathId, from, to };
}

function pickPath(paths: readonly StructurePath[], random: SeededRandom): StructurePath {
  const eligible = paths.filter(path => path.length >= MIN_PATH_LENGTH);
  const total = eligible.reduce((sum, path) => sum + path.length, 0);
  let roll = random.next() * total;
  for (const path of eligible) {
    roll -= path.length;
    if (roll < 0) {
      return path;
    }
  }
  return eligible[eligible.length - 1];
}

function drawSpanLength(path: StructurePath, split: ZoneSplit, random: SeededRandom): number {
  const min = Math.max(split === 'chain' ? 0.3 : 0.2, MIN_ZONE_LENGTH / path.length);
  const max = Math.max(min, split === 'chain' ? 0.55 : 0.45);
  return draw(min, max, random);
}

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

function segmentLength(segment: StructurePath['segments'][number]): number {
  return Math.hypot(segment.to.x - segment.from.x, segment.to.y - segment.from.y);
}

function draw(min: number, max: number, random: SeededRandom): number {
  return min + random.next() * (max - min);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function insideShape(shape: WorldShape, point: WorldPoint): boolean {
  return containsWorld(shape, 2 * point.x - 1, 2 * point.y - 1);
}
