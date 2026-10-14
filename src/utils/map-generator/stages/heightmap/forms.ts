import {
  BORDER_GATE_FADE_METERS,
  BORDER_GATE_METERS,
  MAX_FORMS_PER_REGION,
  MIN_ISLAND_RADIUS_METERS,
} from './defaults';
import { REGION_SHAPES, type RegionShape } from './region-shape';
import type { WorldDimensions } from '../../../world-dimensions';
import type { RandomFactory, SeededRandom } from '../../random';
import type { WorldSpace } from '../../space';
import type {
  GeologicalRegionPlan,
  GeologyPlan,
  RegionTerrainConfig,
  WorldPoint,
} from '../../types';

/** One island mass stamped into the height field; all sizes are in metres. */
export interface IslandForm {
  readonly regionIndex: number;
  /** Footprint centre of the island mass, in normalized 0..1 coordinates. */
  readonly centre: WorldPoint;
  /** Asymmetric summit shifted toward one edge to create a steep cliff side. */
  readonly peak: WorldPoint;
  /** Nominal land radius in metres where the profile crosses 0 m. */
  readonly radiusMeters: number;
  /** Outer radius in metres where the underwater shelf meets the ocean floor. */
  readonly shelfRadiusMeters: number;
  /** Peak height of this specific island in metres. */
  readonly peakMeters: number;
  /** Orientation angle in radians and axis stretch for non-circular islands. */
  readonly angleRadians: number;
  readonly aspect: number;
  /** Whether this form has an inner cavity: a crater or a lagoon. */
  readonly hasCavity: boolean;
}

export interface RegionFormsInput {
  readonly regionIndex: number;
  readonly region: GeologicalRegionPlan;
  /** Terrain parameters of this region, already resolved from the config. */
  readonly terrain: RegionTerrainConfig;
  /** Interior cell indices: every cell of this region deeper than the gate margin. */
  readonly cells: readonly number[];
  readonly ownerMap: Int16Array;
  readonly borderDistanceMap: Float32Array;
  readonly dimensions: WorldDimensions;
  readonly space: WorldSpace;
  readonly random: RandomFactory;
  readonly amplitudeMeters: number;
}

/** Probes spent on the first form; it also gets the deepest cell. */
const MAIN_CELL_PROBES = 16;
/** Probes of one separate archipelago island in the best-candidate pick. */
const SEPARATE_CELL_PROBES = 12;
/** How separated distinct islands are, in multiples of the two radii. */
const SEPARATION_FACTOR = 1.35;
/** Lobe chance at concentration 0 and its rise toward concentration 1. */
const LOBE_CHANCE_BASE = 0.35;
const LOBE_CHANCE_GROWTH = 0.45;
/** Lobe distance from its anchor, as a share of the anchor radius. */
const LOBE_DISTANCE_MIN = 0.55;
const LOBE_DISTANCE_RANGE = 0.4;
/** Land area drawn from the slider, and the compensation for overlapping forms. */
const LAND_SHARE_FLOOR = 0.06;
const LAND_SHARE_RANGE = 0.94;
const AREA_COMPENSATION = 1.25;
/** The biggest island of a region, as a share of the region's square root. */
const MAX_RADIUS_SHARE = 0.42;
/** Below this land share the form count shrinks to avoid tiny specks. */
const SPARSE_LAND_SHARE = 0.15;
/** Per-island variation: stretch, falling size, age relief and cliff shift. */
const ASPECT_VARIATION = 0.45;
const SIZE_FALLING_POWER = 0.55;
const AGE_RELIEF_SHARE = 0.35;
const CLIFF_OFFSET_MIN = 0.25;
const CLIFF_OFFSET_RANGE = 0.65;
const AGE_CLIFF_SHARE = 0.4;
/** Cavities only carve forms clearly above the minimal radius. */
const CAVITY_MIN_RADIUS_FACTOR = 1.3;

/**
 * Interior cells of every region, indexed by region: all cells deeper than
 * the border gate margin. One pass over the owner raster, so regions never
 * rescan the whole world.
 */
export function collectRegionInteriors(
  plan: GeologyPlan,
  ownerMap: Int16Array,
  borderDistanceMap: Float32Array
): readonly (readonly number[])[] {
  const interiors: number[][] = plan.regions.map(() => []);
  for (let index = 0; index < ownerMap.length; index++) {
    const region = ownerMap[index];
    if (region >= 0 && borderDistanceMap[index] > BORDER_GATE_METERS) {
      interiors[region]?.push(index);
    }
  }
  return interiors;
}

/**
 * Builds the island forms of one region: seeded, seed-stable masses whose
 * count, sizes and spacing follow the region's concentration and land share,
 * with lobes merging into larger islands and separate masses keeping open
 * sea between them. Every number a form consumes comes from REGION_SHAPES.
 */
export function buildRegionForms(input: RegionFormsInput): IslandForm[] {
  const cells = interiorCells(input.cells, input.borderDistanceMap);
  if (cells.length === 0) {
    return [];
  }
  const shape = REGION_SHAPES[input.region.type];
  const stream = input.random.create(`heightmap.${input.region.id}.forms`);
  const count = formCount(input.terrain, shape);
  const weights = formWeights(stream, count, input.terrain.concentration);
  const radii = formRadii(input.region, input.terrain, shape, weights);
  const maxRadius = radii.reduce((max, radius) => Math.max(max, radius), MIN_ISLAND_RADIUS_METERS);
  const forms: IslandForm[] = [];
  for (let index = 0; index < count; index++) {
    const radiusMeters = radii[index] ?? MIN_ISLAND_RADIUS_METERS;
    const centre =
      index === 0
        ? deepestCentre(stream, cells, input)
        : nextCentre(stream, cells, input, forms, radiusMeters);
    forms.push(createForm(stream, input, shape, centre, radiusMeters, maxRadius));
  }
  return forms;
}

/** Deep interior first; narrow regions fall back to their whole interior. */
function interiorCells(
  cells: readonly number[],
  borderDistanceMap: Float32Array
): readonly number[] {
  const deepMargin = BORDER_GATE_METERS + BORDER_GATE_FADE_METERS;
  const deep: number[] = [];
  for (const index of cells) {
    if (borderDistanceMap[index] >= deepMargin) {
      deep.push(index);
    }
  }
  return deep.length > 0 ? deep : cells;
}

/** Few focused masses or many scattered ones; sparse land sheds forms. */
function formCount(terrain: RegionTerrainConfig, shape: RegionShape): number {
  const concentration = clamp01(terrain.concentration);
  const raw = shape.maxForms - (shape.maxForms - shape.minForms) * concentration;
  const landShare = clamp01(terrain.landShare);
  if (landShare >= SPARSE_LAND_SHARE) {
    return clampCount(raw);
  }
  return clampCount(raw * (0.5 + (landShare / SPARSE_LAND_SHARE) * 0.5));
}

function clampCount(value: number): number {
  return Math.max(1, Math.min(MAX_FORMS_PER_REGION, Math.round(value)));
}

/** Power-law weights: focused regions let the first form take most of the area. */
function formWeights(stream: SeededRandom, count: number, concentration: number): number[] {
  const exponent = 0.65 + 1.15 * clamp01(concentration);
  const raw = Array.from(
    { length: count },
    (_, index) => Math.pow(index + 1, -exponent) * (0.75 + 0.5 * stream.next())
  );
  const total = raw.reduce((sum, value) => sum + value, 0);
  return raw.map(value => value / total);
}

/** Radii from the region's target land area, floored and capped per region. */
function formRadii(
  region: GeologicalRegionPlan,
  terrain: RegionTerrainConfig,
  shape: RegionShape,
  weights: readonly number[]
): number[] {
  const targetLandArea =
    region.areaSquareMeters *
    shape.coverageFactor *
    (LAND_SHARE_FLOOR + LAND_SHARE_RANGE * clamp01(terrain.landShare));
  const maxRadius = maxRegionRadius(region);
  return weights.map(weight =>
    Math.min(
      maxRadius,
      Math.max(
        MIN_ISLAND_RADIUS_METERS,
        Math.sqrt((targetLandArea * weight * AREA_COMPENSATION) / Math.PI)
      )
    )
  );
}

function maxRegionRadius(region: GeologicalRegionPlan): number {
  return Math.max(MIN_ISLAND_RADIUS_METERS, MAX_RADIUS_SHARE * Math.sqrt(region.areaSquareMeters));
}

/** The first form anchors on the deepest probed cell, away from every border. */
function deepestCentre(
  stream: SeededRandom,
  cells: readonly number[],
  input: RegionFormsInput
): WorldPoint {
  let bestIndex = pickCell(stream, cells);
  let bestDistance = -Infinity;
  for (let attempt = 0; attempt < MAIN_CELL_PROBES; attempt++) {
    const index = pickCell(stream, cells);
    const distance = input.borderDistanceMap[index];
    if (distance > bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }
  return cellPoint(bestIndex, input.space);
}

/**
 * Later forms either merge as a lobe near an earlier mass (peninsulas and
 * bays inside one island) or pick the best-candidate cell that keeps the
 * target spacing, so separate islands keep open sea between them.
 */
function nextCentre(
  stream: SeededRandom,
  cells: readonly number[],
  input: RegionFormsInput,
  placed: readonly IslandForm[],
  radiusMeters: number
): WorldPoint {
  const lobeChance = LOBE_CHANCE_BASE + LOBE_CHANCE_GROWTH * clamp01(input.terrain.concentration);
  if (placed.length > 0 && stream.next() < lobeChance) {
    const lobe = lobeCentre(stream, input, placed);
    if (lobe) {
      return lobe;
    }
  }
  return separateCentre(stream, cells, input, placed, radiusMeters);
}

function lobeCentre(
  stream: SeededRandom,
  input: RegionFormsInput,
  placed: readonly IslandForm[]
): WorldPoint | undefined {
  const anchor = placed[Math.min(placed.length - 1, Math.floor(stream.next() * placed.length))];
  if (!anchor) {
    return undefined;
  }
  const distance = anchor.radiusMeters * (LOBE_DISTANCE_MIN + LOBE_DISTANCE_RANGE * stream.next());
  const direction = stream.next() * Math.PI * 2;
  const centre = {
    x: anchor.centre.x + (Math.cos(direction) * distance) / input.dimensions.widthMeters,
    y: anchor.centre.y + (Math.sin(direction) * distance) / input.dimensions.heightMeters,
  };
  const cell = input.space.normalizedToCell(centre.x, centre.y);
  const index = cell.y * input.space.sampleWidth + cell.x;
  if (input.ownerMap[index] !== input.regionIndex) {
    return undefined;
  }
  return centre;
}

function separateCentre(
  stream: SeededRandom,
  cells: readonly number[],
  input: RegionFormsInput,
  placed: readonly IslandForm[],
  radiusMeters: number
): WorldPoint {
  let best: WorldPoint | undefined;
  let bestScore = Infinity;
  for (let attempt = 0; attempt < SEPARATE_CELL_PROBES; attempt++) {
    const point = cellPoint(pickCell(stream, cells), input.space);
    const score = separationScore(point, radiusMeters, placed, input.space);
    if (score < bestScore) {
      bestScore = score;
      best = point;
    }
  }
  return best ?? cellPoint(cells[0] ?? 0, input.space);
}

function separationScore(
  point: WorldPoint,
  radiusMeters: number,
  placed: readonly IslandForm[],
  space: WorldSpace
): number {
  let nearestDistance = Infinity;
  let nearestRadius = 0;
  for (const form of placed) {
    const distance = space.distanceMeters(point, form.centre);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestRadius = form.radiusMeters;
    }
  }
  if (!Number.isFinite(nearestDistance)) {
    return 0;
  }
  return Math.abs(nearestDistance - SEPARATION_FACTOR * (radiusMeters + nearestRadius));
}

/** Per-island character: stretch, orientation, relief and the cliff offset. */
function createForm(
  stream: SeededRandom,
  input: RegionFormsInput,
  shape: RegionShape,
  centre: WorldPoint,
  radiusMeters: number,
  maxRadiusMeters: number
): IslandForm {
  const aspect = 1 + ASPECT_VARIATION * stream.next();
  const angleRadians = stream.next() * Math.PI * 2;
  const relief = islandRelief(stream, input.terrain, shape);
  const sizeFactor = Math.pow(radiusMeters / maxRadiusMeters, SIZE_FALLING_POWER);
  const age = clamp01(input.terrain.age);
  const peakMeters =
    input.amplitudeMeters *
    shape.amplitudeFactor *
    relief *
    sizeFactor *
    (1 - AGE_RELIEF_SHARE * age);
  const offsetMeters =
    radiusMeters *
    shape.cliffShare *
    (CLIFF_OFFSET_MIN + CLIFF_OFFSET_RANGE * stream.next()) *
    (1 - AGE_CLIFF_SHARE * age);
  const cliffAngle = stream.next() * Math.PI * 2;
  const peak = {
    x: centre.x + (Math.cos(cliffAngle) * offsetMeters) / input.dimensions.widthMeters,
    y: centre.y + (Math.sin(cliffAngle) * offsetMeters) / input.dimensions.heightMeters,
  };
  const hasCavity =
    shape.cavityShare > 0 &&
    radiusMeters > MIN_ISLAND_RADIUS_METERS * CAVITY_MIN_RADIUS_FACTOR &&
    stream.next() < shape.cavityShare;
  return {
    regionIndex: input.regionIndex,
    centre,
    peak,
    radiusMeters,
    shelfRadiusMeters: radiusMeters * shape.shelfFactor,
    peakMeters,
    angleRadians,
    aspect,
    hasCavity,
  };
}

/**
 * Per-island relief: types with mountainousness draw both flat and tall
 * islands, weighted by the slider; other types vary gently.
 */
function islandRelief(
  stream: SeededRandom,
  terrain: RegionTerrainConfig,
  shape: RegionShape
): number {
  if (!shape.usesMountainousness) {
    return 0.65 + 0.55 * stream.next();
  }
  const exponent = 1.35 - 0.9 * clamp01(terrain.mountainousness);
  return 0.25 + 1.15 * Math.pow(stream.next(), exponent);
}

/** One interior cell index as a normalized point, through the shared space. */
function cellPoint(index: number, space: WorldSpace): WorldPoint {
  const x = index % space.sampleWidth;
  const y = Math.floor(index / space.sampleWidth);
  return space.cellToNormalized(x, y);
}

function pickCell(stream: SeededRandom, cells: readonly number[]): number {
  const pick = Math.min(cells.length - 1, Math.floor(stream.next() * cells.length));
  return cells[Math.max(0, pick)] ?? 0;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
