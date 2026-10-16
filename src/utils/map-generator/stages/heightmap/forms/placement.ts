import type { IslandForm, RegionFormsInput } from './forms';
import type { SeededRandom } from '../../../random';
import type { WorldSpace } from '../../../space';
import type { WorldPoint } from '../../../types';
import type { RegionShape } from '../config/region-shape';
import { BORDER_GATE_FADE_METERS, BORDER_GATE_METERS } from '../defaults';

/** Probes spent on the main form; it also anchors near the region centre. */
const MAIN_CELL_PROBES = 16;
/** How far the main form may sit from the region centre, as a share of its span. */
const MAIN_OFFSET_SHARE = 0.18;
/** Probes of one separate archipelago island in the best-candidate pick. */
const SEPARATE_CELL_PROBES = 16;
/** Smallest separation of distinct islands, in multiples of the two radii. */
const CLEARANCE_FACTOR = 1.85;
/** Cost weight of a candidate closer than the clearance, per metre. */
const CLEARANCE_PENALTY = 10;
/** Fade share of the gate the forms keep clear of, and their radius share. */
const BORDER_MARGIN_SHARE = 0.7;
/** Radius share of the main form's own margin; a lobe keeps less. */
const MAIN_MARGIN_RADIUS_SHARE = 0.9;
const LOBE_MARGIN_SHARE = 0.6;
/** Share of the region the target spread adds at clustering 0. */
const SPREAD_SHARE = 0.9;
/** Cost relief per metre of distance from the average island at clustering 0. */
const SPREAD_BONUS = 0.25;
/** Lobe chance: a base share plus a power rise with the division slider. */
const LOBE_BASE_CHANCE = 0.28;
const LOBE_CHANCE_GROWTH = 0.55;
const LOBE_CHANCE_POWER = 1.4;
/** Peninsula lobe distance from its anchor, as a share of the anchor radius. */
const PENINSULA_DISTANCE_MIN = 0.72;
const PENINSULA_DISTANCE_RANGE = 0.26;
/** Sister island gap, as a multiple of the two joined radii. */
const STRAIT_GAP_MIN = 1.06;
const STRAIT_GAP_RANGE = 0.18;
/** Reef islets cluster near an existing plain islet with this chance. */
const ISLET_GROUP_CHANCE = 0.45;
/** Group distance from its anchor, as a share of the anchor radius. */
const GROUP_DISTANCE_MIN = 0.95;
const GROUP_DISTANCE_RANGE = 0.5;

/**
 * The main form anchors near the centre of its region, keeping a full safety
 * margin from every border so even its biggest form fits inside the gate.
 * A small seeded offset keeps the mass off dead centre.
 */
export function mainCentre(
  stream: SeededRandom,
  cells: readonly number[],
  input: RegionFormsInput,
  maxRadiusMeters: number
): WorldPoint {
  const span = Math.sqrt(input.region.areaSquareMeters);
  const targetOffset = stream.next() * MAIN_OFFSET_SHARE * span;
  const margin =
    BORDER_GATE_METERS + BORDER_GATE_FADE_METERS + maxRadiusMeters * MAIN_MARGIN_RADIUS_SHARE;
  let best: WorldPoint | undefined;
  let bestScore = Infinity;
  for (let attempt = 0; attempt < MAIN_CELL_PROBES; attempt++) {
    const index = pickCell(stream, cells);
    const point = cellPoint(index, input.space);
    const score =
      Math.abs(input.space.distanceMeters(point, input.region.centre) - targetOffset) +
      borderPenalty(index, margin, input);
    if (score < bestScore) {
      bestScore = score;
      best = point;
    }
  }
  return best ?? cellPoint(cells[0] ?? 0, input.space);
}

/**
 * Later forms either merge as a lobe near an earlier mass (peninsulas and
 * bays inside one island) or pick the best-candidate cell that keeps the
 * target spacing, so separate islands keep open sea between them. Reef
 * regions never lobe: atolls would glue into one misshapen reef.
 */
export function nextCentre(
  stream: SeededRandom,
  cells: readonly number[],
  input: RegionFormsInput,
  shape: RegionShape,
  placed: readonly IslandForm[],
  radiusMeters: number,
  count: number,
  hasCavity: boolean
): WorldPoint {
  // Reef regions gather plain islets into small groups on one shoal, while
  // atolls never glue to each other and keep the open lagoon between them.
  if (shape.cavityFloorShare < 0 && !hasCavity && placed.length > 0) {
    if (stream.next() < ISLET_GROUP_CHANCE) {
      const group = isletGroupCentre(stream, input, placed);
      if (group) {
        return group;
      }
    }
    return separateCentre(stream, cells, input, placed, radiusMeters, count);
  }
  const lobeChance =
    shape.cavityFloorShare < 0
      ? 0
      : LOBE_BASE_CHANCE +
        LOBE_CHANCE_GROWTH * Math.pow(clamp01(input.terrain.concentration), LOBE_CHANCE_POWER);
  if (placed.length > 0 && lobeChance > 0 && stream.next() < lobeChance) {
    const lobe = lobeCentre(stream, input, placed, radiusMeters);
    if (lobe) {
      return lobe;
    }
  }
  return separateCentre(stream, cells, input, placed, radiusMeters, count);
}

/** One small islet joining an existing cavity-free islet into a cluster. */
function isletGroupCentre(
  stream: SeededRandom,
  input: RegionFormsInput,
  placed: readonly IslandForm[]
): WorldPoint | undefined {
  const anchors = placed.filter(form => !form.hasCavity);
  if (anchors.length === 0) {
    return undefined;
  }
  const anchor = anchors[Math.min(anchors.length - 1, Math.floor(stream.next() * anchors.length))];
  if (!anchor) {
    return undefined;
  }
  const distance =
    anchor.radiusMeters * (GROUP_DISTANCE_MIN + GROUP_DISTANCE_RANGE * stream.next());
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

function lobeCentre(
  stream: SeededRandom,
  input: RegionFormsInput,
  placed: readonly IslandForm[],
  radiusMeters: number
): WorldPoint | undefined {
  const anchor = placed[Math.min(placed.length - 1, Math.floor(stream.next() * placed.length))];
  if (!anchor) {
    return undefined;
  }
  // Half the companions join as a peninsula with a narrow neck, the other
  // half stand beside the anchor as a sister island behind a thin strait.
  const peninsula = stream.next() < 0.5;
  const distance = peninsula
    ? anchor.radiusMeters * (PENINSULA_DISTANCE_MIN + PENINSULA_DISTANCE_RANGE * stream.next())
    : (anchor.radiusMeters + radiusMeters) * (STRAIT_GAP_MIN + STRAIT_GAP_RANGE * stream.next());
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
  const margin =
    BORDER_GATE_METERS + BORDER_GATE_FADE_METERS * LOBE_MARGIN_SHARE + anchor.radiusMeters * 0.6;
  if ((input.borderDistanceMap[index] ?? 0) < margin) {
    return undefined;
  }
  return centre;
}

/**
 * Best-candidate spread: candidates closer than the clearance are penalized
 * hard, farther ones are scored against the target spread of the region, so
 * a low concentration scatters islands across it while a high one keeps them
 * gathered. A candidate too close to a region or world border is penalized
 * even harder, proportionally to its radius.
 */
function separateCentre(
  stream: SeededRandom,
  cells: readonly number[],
  input: RegionFormsInput,
  placed: readonly IslandForm[],
  radiusMeters: number,
  count: number
): WorldPoint {
  let best: WorldPoint | undefined;
  let bestCost = Infinity;
  for (let attempt = 0; attempt < SEPARATE_CELL_PROBES; attempt++) {
    const point = cellPoint(pickCell(stream, cells), input.space);
    const cost = placementCost(point, radiusMeters, placed, input, count);
    if (cost < bestCost) {
      bestCost = cost;
      best = point;
    }
  }
  return best ?? cellPoint(cells[0] ?? 0, input.space);
}

/** Cost of one candidate: overlaps, the target spread and the border margin. */
function placementCost(
  point: WorldPoint,
  radiusMeters: number,
  placed: readonly IslandForm[],
  input: RegionFormsInput,
  count: number
): number {
  const cell = input.space.normalizedToCell(point.x, point.y);
  const cellIndex = cell.y * input.space.sampleWidth + cell.x;
  // Bigger islands hold farther from every border: the gate needs the margin.
  const requiredBorderMargin =
    BORDER_GATE_METERS + BORDER_GATE_FADE_METERS * BORDER_MARGIN_SHARE + radiusMeters * 1.15;
  let cost = borderPenalty(cellIndex, requiredBorderMargin, input);
  let nearestDistance = Infinity;
  let nearestRadius = 0;
  for (const form of placed) {
    const distance = input.space.distanceMeters(point, form.centre);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestRadius = form.radiusMeters;
    }
  }
  if (placed.length > 0) {
    // At low clustering, prefer candidates far from the average island, so
    // the archipelago fills the whole region instead of one far corner.
    const spreadFactor = 1 - clamp01(input.terrain.clustering);
    if (spreadFactor > 0) {
      cost -= spreadFactor * input.space.distanceMeters(point, meanPoint(placed)) * SPREAD_BONUS;
    }
  }
  if (!Number.isFinite(nearestDistance)) {
    return cost;
  }
  const minClearance = CLEARANCE_FACTOR * (radiusMeters + nearestRadius);
  if (nearestDistance < minClearance) {
    return cost + (minClearance - nearestDistance) * CLEARANCE_PENALTY;
  }
  const regionSpan = Math.sqrt(input.region.areaSquareMeters);
  const spreadFactor = 1 - clamp01(input.terrain.clustering);
  const targetDistance =
    minClearance + spreadFactor * (regionSpan / Math.sqrt(count + 1)) * SPREAD_SHARE;
  return cost + Math.abs(nearestDistance - targetDistance);
}

/** Average centre of the placed forms, in normalized coordinates. */
function meanPoint(placed: readonly IslandForm[]): WorldPoint {
  let x = 0;
  let y = 0;
  for (const form of placed) {
    x += form.centre.x;
    y += form.centre.y;
  }
  return { x: x / placed.length, y: y / placed.length };
}

/** Cost of a cell closer to a border than the required margin. */
function borderPenalty(index: number, margin: number, input: RegionFormsInput): number {
  const clearance = input.borderDistanceMap[index] ?? 0;
  if (clearance >= margin) {
    return 0;
  }
  return (margin - clearance) * CLEARANCE_PENALTY;
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
