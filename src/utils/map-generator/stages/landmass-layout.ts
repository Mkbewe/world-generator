import {
  ARCHETYPE_RECIPES,
  type ArchetypeBar,
  type ArchetypeRange,
  type ArchetypeRecipe,
  LANDMASS_ARCHETYPES,
} from './landmass-archetypes';
import { LANDMASS_GROUP_DISTANCE, LANDMASS_MARGIN, STRUCTURE_GAP } from './landmass-defaults';
import { containsWorld, type WorldShape } from '../../world-shape';
import type { SeededRandom } from '../random/seeded-random';
import type {
  LandmassArchetype,
  LandmassConfig,
  LandmassLayout,
  LandShape,
  ShelfDefinition,
  WorldPoint,
} from '../types';

/** Placement scales tried in order until the whole spine fits inside the world. */
const SPINE_PLACEMENT_SHRINKS = [
  1, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4, 0.35, 0.3, 0.25, 0.2, 0.15,
  0.1,
];

/** Starts sampled per shrink step; the roomiest candidate wins. */
const PLACEMENT_CANDIDATES = 8;

/** Step of the sampled spine distance, fine enough for the required gap. */
const SPINE_SAMPLE_STEP = 0.01;

/** Samples around an attached shape, so its outline cannot escape the world. */
const SHAPE_OUTLINE_SAMPLES = 12;

/** Structure geometry before the shelf grouping. */
export interface StructureSeed {
  readonly spine: readonly WorldPoint[];
  readonly widthProfile: readonly number[];
  readonly orientation: number;
  readonly irregularity: number;
  readonly positiveShapes: readonly LandShape[];
  readonly negativeShapes: readonly LandShape[];
}

/**
 * Builds one structure from the configuration and the deterministic stream. A
 * candidate counts only when its complete outline stays inside the world margin
 * and keeps clear of the structures placed so far; of the sampled starts the
 * roomiest one wins, which also spreads the structures over the world instead
 * of letting them cluster.
 */
export function createStructure(
  index: number,
  config: LandmassConfig,
  shape: WorldShape,
  random: SeededRandom,
  placed: readonly StructureSeed[] = []
): StructureSeed {
  const recipe = ARCHETYPE_RECIPES[pickArchetype(config.archetypes, random)];
  const base = sampleRange(recipe.width, random) * config.size;
  const taper = sampleRange(recipe.taper, random);
  const { offsets, handedness } = createSpineOffsets(recipe, config.size, random);
  const prefix = `landmass-${index + 1}`;
  let roomiest: { structure: StructureSeed; clearance: number } | undefined;

  for (const shrink of SPINE_PLACEMENT_SHRINKS) {
    for (let candidate = 0; candidate < PLACEMENT_CANDIDATES; candidate++) {
      const start = randomPointInside(shape, random);
      const spine = offsets.map(offset => ({
        x: start.x + offset.x * shrink,
        y: start.y + offset.y * shrink,
      }));
      const structure = buildStructure(
        prefix,
        recipe,
        spine,
        base,
        taper,
        handedness,
        config,
        shape,
        random,
        shrink
      );
      if (!outlineInsideWorld(structure, shape)) {
        continue;
      }
      const clearance = clearanceFrom(structure, placed);
      if (clearance >= STRUCTURE_GAP) {
        return structure;
      }
      if (!roomiest || clearance > roomiest.clearance) {
        roomiest = { structure, clearance };
      }
    }
  }

  // A crowded world takes the roomiest candidate found, or the world centre.
  return (
    roomiest?.structure ??
    centredStructure(prefix, recipe, offsets, base, taper, handedness, config, shape, random)
  );
}

/**
 * Deterministic last resort for a crowded world: the world centre at the
 * largest shrink whose outline still fits inside the margin.
 */
function centredStructure(
  prefix: string,
  recipe: ArchetypeRecipe,
  offsets: readonly WorldPoint[],
  base: number,
  taper: number,
  handedness: number,
  config: LandmassConfig,
  shape: WorldShape,
  random: SeededRandom
): StructureSeed {
  const smallest = SPINE_PLACEMENT_SHRINKS[SPINE_PLACEMENT_SHRINKS.length - 1];

  for (const shrink of SPINE_PLACEMENT_SHRINKS) {
    const spine = offsets.map(offset => ({
      x: 0.5 + offset.x * shrink,
      y: 0.5 + offset.y * shrink,
    }));
    const structure = buildStructure(
      prefix,
      recipe,
      spine,
      base,
      taper,
      handedness,
      config,
      shape,
      random,
      shrink
    );
    if (outlineInsideWorld(structure, shape)) {
      return structure;
    }
  }

  const spine = offsets.map(offset => ({
    x: 0.5 + offset.x * smallest,
    y: 0.5 + offset.y * smallest,
  }));
  return buildStructure(
    prefix,
    recipe,
    spine,
    base,
    taper,
    handedness,
    config,
    shape,
    random,
    smallest
  );
}

/** Whether the complete outline of a structure stays inside the world margin. */
export function outlineInsideWorld(structure: StructureSeed, shape: WorldShape): boolean {
  for (const [index, point] of structure.spine.entries()) {
    if (!insideWorldBy(shape, point, structure.widthProfile[index])) {
      return false;
    }
  }
  return structure.positiveShapes.every(land => shapeInsideWorld(land, shape));
}

/** Samples the ellipse outline, so a peninsula or bar cannot poke out of the world. */
function shapeInsideWorld(land: LandShape, shape: WorldShape): boolean {
  const cos = Math.cos(land.orientation);
  const sin = Math.sin(land.orientation);
  for (let step = 0; step < SHAPE_OUTLINE_SAMPLES; step++) {
    const angle = (step / SHAPE_OUTLINE_SAMPLES) * Math.PI * 2;
    const along = Math.cos(angle) * land.halfLength;
    const across = Math.sin(angle) * land.halfWidth;
    const point = {
      x: land.center.x + along * cos - across * sin,
      y: land.center.y + along * sin + across * cos,
    };
    if (!insideWorld(shape, point)) {
      return false;
    }
  }
  return true;
}

/** Smallest gap between a candidate structure and the placed ones; negative means overlap. */
function clearanceFrom(structure: StructureSeed, placed: readonly StructureSeed[]): number {
  const bounds = spineBounds(structure.spine);
  const reach = structureReach(structure);
  let clearance = Infinity;
  for (const other of placed) {
    const required = reach + structureReach(other);
    if (boundsGap(bounds, spineBounds(other.spine)) > required + STRUCTURE_GAP) {
      continue;
    }
    const distance = sampledSpineDistance(structure.spine, other.spine);
    clearance = Math.min(clearance, distance - required);
  }
  return clearance;
}

/** Farthest outline point of a placed structure from its spine. */
function structureReach(structure: StructureSeed): number {
  let reach = 0;
  for (const width of structure.widthProfile) {
    reach = Math.max(reach, width);
  }
  for (const shape of structure.positiveShapes) {
    reach = Math.max(
      reach,
      sampledSpineDistance([shape.center], structure.spine) +
        Math.max(shape.halfLength, shape.halfWidth)
    );
  }
  return reach;
}

interface SpineBounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

function spineBounds(spine: readonly WorldPoint[]): SpineBounds {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const point of spine) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  return { minX, maxX, minY, maxY };
}

/** Distance between two bounding boxes; 0 when they overlap. */
function boundsGap(left: SpineBounds, right: SpineBounds): number {
  const gapX = Math.max(0, left.minX - right.maxX, right.minX - left.maxX);
  const gapY = Math.max(0, left.minY - right.maxY, right.minY - left.maxY);
  return Math.hypot(gapX, gapY);
}

/** Nearest distance between two spines, sampled finely enough for the gap. */
function sampledSpineDistance(left: readonly WorldPoint[], right: readonly WorldPoint[]): number {
  let nearest = Infinity;
  for (const first of sampleSpine(left)) {
    for (const second of sampleSpine(right)) {
      nearest = Math.min(nearest, Math.hypot(first.x - second.x, first.y - second.y));
    }
  }
  return nearest;
}

/** Points every step along the polyline, including both ends. */
function sampleSpine(spine: readonly WorldPoint[]): WorldPoint[] {
  const points: WorldPoint[] = [];
  for (let index = 1; index < spine.length; index++) {
    const from = spine[index - 1];
    const to = spine[index];
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(1, Math.ceil(length / SPINE_SAMPLE_STEP));
    for (let step = 0; step < steps; step++) {
      const ratio = step / steps;
      points.push({ x: from.x + (to.x - from.x) * ratio, y: from.y + (to.y - from.y) * ratio });
    }
  }
  const last = spine[spine.length - 1];
  if (last) {
    points.push(last);
  }
  return points;
}

/** Completes a placed spine with its width profile, shapes and shelf-less metadata. */
function buildStructure(
  prefix: string,
  recipe: ArchetypeRecipe,
  spine: readonly WorldPoint[],
  base: number,
  taper: number,
  handedness: number,
  config: LandmassConfig,
  shape: WorldShape,
  random: SeededRandom,
  scale: number
): StructureSeed {
  // A two-point recipe needs a midpoint so its profile can reach the sampled
  // base width instead of staying at the tapered end width everywhere.
  const outlineSpine =
    spine.length === 2
      ? [spine[0], { x: (spine[0].x + spine[1].x) / 2, y: (spine[0].y + spine[1].y) / 2 }, spine[1]]
      : spine;
  const spineLength = polylineLength(outlineSpine);
  let traversed = 0;
  const widthProfile = outlineSpine.map((point, index) => {
    if (index > 0) {
      traversed += Math.hypot(
        point.x - outlineSpine[index - 1].x,
        point.y - outlineSpine[index - 1].y
      );
    }
    const position = spineLength > 0 ? traversed / spineLength : 0.5;
    return base * scale * (taper + (1 - taper) * Math.sin(Math.PI * position));
  });
  const last = outlineSpine[outlineSpine.length - 1];

  return {
    spine: outlineSpine,
    widthProfile,
    orientation: Math.atan2(last.y - outlineSpine[0].y, last.x - outlineSpine[0].x),
    irregularity: config.irregularity,
    positiveShapes: [
      ...createShapes(`${prefix}-peninsula`, shape, outlineSpine, widthProfile, random, 1, 2, {
        coast: 0.78,
        reach: 0.15,
        length: [0.3, 0.55],
        width: [0.25, 0.4],
      }),
      ...createBars(prefix, recipe.bars ?? [], spine, config.size * scale, handedness, random),
    ],
    negativeShapes: createShapes(`${prefix}-bay`, shape, outlineSpine, widthProfile, random, 0, 2, {
      coast: 1.08,
      reach: 0.15,
      length: [0.35, 0.6],
      width: [0.22, 0.36],
    }),
  };
}

/** Deterministic branches of the recipe: crossbars and stems a spine cannot draw. */
function createBars(
  prefix: string,
  bars: readonly ArchetypeBar[],
  spine: readonly WorldPoint[],
  size: number,
  handedness: number,
  random: SeededRandom
): LandShape[] {
  return bars.map((bar, index) => {
    const at = sampleRange(bar.at, random);
    const { center, direction } = spinePointAt(spine, at);
    const orientation =
      bar.angle === 'bisector'
        ? cornerStemDirection(spine, at)
        : direction + handedness * sampleRange(bar.angle, random);
    const halfLength = sampleRange(bar.length, random) * size;
    const bias = sampleRange(bar.bias, random) * halfLength;
    return {
      id: `${prefix}-bar-${index + 1}`,
      center: {
        x: center.x + Math.cos(orientation) * bias,
        y: center.y + Math.sin(orientation) * bias,
      },
      halfLength,
      halfWidth: sampleRange(bar.width, random) * size,
      orientation,
      irregularity: 0,
    };
  });
}

/**
 * Point and local direction in vertex space: 0 is the first spine point, 1 the
 * last, and fractions interpolate along the segment between two points. A point
 * landing on an interior vertex keeps the direction of the incoming segment, so
 * a bar anchored at a bend leans against the arm that arrives there.
 */
function spinePointAt(
  spine: readonly WorldPoint[],
  at: number
): { readonly center: WorldPoint; readonly direction: number } {
  if (spine.length < 2) {
    return { center: { x: 0.5, y: 0.5 }, direction: 0 };
  }

  const position = Math.min(1, Math.max(0, at)) * (spine.length - 1);
  const lower = Math.floor(position);
  const ratio = position - lower;
  const upper = Math.min(spine.length - 1, lower + 1);
  const from = spine[lower];
  const to = spine[upper];
  const segment = ratio === 0 && lower > 0 ? lower - 1 : lower;

  return {
    center: { x: from.x + (to.x - from.x) * ratio, y: from.y + (to.y - from.y) * ratio },
    direction: segmentDirection(spine, segment),
  };
}

function segmentDirection(spine: readonly WorldPoint[], index: number): number {
  const from = spine[index];
  const to = spine[index + 1];
  return Math.atan2(to.y - from.y, to.x - from.x);
}

/**
 * Direction of a stem leaving an interior vertex opposite its two arms, so a
 * Y always branches away from the corner, whatever the sampled turn is.
 */
function cornerStemDirection(spine: readonly WorldPoint[], at: number): number {
  if (spine.length < 3) {
    return segmentDirection(spine, 0);
  }
  const index = Math.min(spine.length - 2, Math.max(1, Math.round(at * (spine.length - 1))));
  const armA = segmentDirection(spine, index - 1) + Math.PI;
  const armB = segmentDirection(spine, index);
  return Math.atan2(-(Math.sin(armA) + Math.sin(armB)), -(Math.cos(armA) + Math.cos(armB)));
}

/**
 * Groups the structures whose spines nearly touch; returns the group index per
 * structure and the number of groups, so each group shares one shelf.
 */
export function groupStructures(structures: readonly StructureSeed[]): {
  readonly groups: readonly number[];
  readonly count: number;
} {
  const parent = structures.map((_, index) => index);
  const find = (index: number): number => {
    while (parent[index] !== index) {
      parent[index] = parent[parent[index]];
      index = parent[index];
    }
    return index;
  };

  for (let left = 0; left < structures.length; left++) {
    for (let right = left + 1; right < structures.length; right++) {
      const distance = spineDistance(structures[left].spine, structures[right].spine);
      if (distance <= LANDMASS_GROUP_DISTANCE) {
        parent[find(left)] = find(right);
      }
    }
  }

  const roots = [...new Set(structures.map((_, index) => find(index)))];
  return {
    groups: structures.map((_, index) => roots.indexOf(find(index))),
    count: roots.length,
  };
}

/** Narrows unknown map info back to a landmass layout, e.g. after restoring a saved map. */
export function isLandmassLayout(value: unknown): value is LandmassLayout {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const { landmasses, shelves } = value as { landmasses?: unknown; shelves?: unknown };
  return (
    Array.isArray(landmasses) &&
    landmasses.length > 0 &&
    Array.isArray(shelves) &&
    shelves.length > 0
  );
}

/** Shelf template per group, with stable ids. */
export function createShelfTemplates(
  config: LandmassConfig,
  count: number
): readonly ShelfDefinition[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `shelf-${index + 1}`,
    ...config.shelf,
  }));
}

/** Relative spine of the recipe; the caller places and sizes it inside the world. */
function createSpineOffsets(
  recipe: ArchetypeRecipe,
  size: number,
  random: SeededRandom
): { readonly offsets: WorldPoint[]; readonly handedness: number } {
  let direction = random.next() * Math.PI * 2;
  const handedness = random.next() < 0.5 ? -1 : 1;
  let point: WorldPoint = { x: 0, y: 0 };
  const points: WorldPoint[] = [point];

  for (let index = 0; index < recipe.segments.length; index++) {
    if (index > 0) {
      direction += handedness * sampleRange(recipe.joints[index - 1], random);
    }
    const length = sampleRange(recipe.segments[index], random) * size;
    point = {
      x: point.x + Math.cos(direction) * length,
      y: point.y + Math.sin(direction) * length,
    };
    points.push(point);
  }

  return { offsets: points, handedness };
}

function pickArchetype(
  pool: readonly LandmassArchetype[] | undefined,
  random: SeededRandom
): LandmassArchetype {
  if (!pool) {
    return LANDMASS_ARCHETYPES[random.nextInteger(0, LANDMASS_ARCHETYPES.length - 1)];
  }
  return pool[random.nextInteger(0, pool.length - 1)];
}

function sampleRange(range: ArchetypeRange, random: SeededRandom): number {
  return range[0] + random.next() * (range[1] - range[0]);
}

/** Where a shape sits relative to the coast; it is offset along its own axis. */
interface ShapePlacement {
  /** Offset from the spine, as a fraction of the local half-width. */
  readonly coast: number;
  /** Extra offset, as a fraction of the shape's half-length. */
  readonly reach: number;
  /** Half-length and half-width as fractions of the local structure width. */
  readonly length: ArchetypeRange;
  readonly width: ArchetypeRange;
}

function createShapes(
  prefix: string,
  shape: WorldShape,
  spine: readonly WorldPoint[],
  widthProfile: readonly number[],
  random: SeededRandom,
  min: number,
  max: number,
  placement: ShapePlacement
): LandShape[] {
  const shapes: LandShape[] = [];
  const count = min + Math.floor(random.next() * (max - min + 1));

  for (let index = 0; index < count; index++) {
    const { anchor, localWidth, direction } = randomSpineAnchor(spine, widthProfile, random);
    const side = random.next() < 0.5 ? -1 : 1;
    let orientation = direction + (side * Math.PI) / 2 + (random.next() - 0.5) * 0.7;
    const halfLength = localWidth * sampleRange(placement.length, random);
    const halfWidth = localWidth * sampleRange(placement.width, random);
    const offset = localWidth * placement.coast + halfLength * placement.reach;
    let candidate = {
      x: anchor.x + Math.cos(orientation) * offset,
      y: anchor.y + Math.sin(orientation) * offset,
    };
    if (!insideWorld(shape, candidate)) {
      orientation += Math.PI;
      candidate = {
        x: anchor.x + Math.cos(orientation) * offset,
        y: anchor.y + Math.sin(orientation) * offset,
      };
    }
    shapes.push({
      id: `${prefix}-${index + 1}`,
      center: insideWorld(shape, candidate) ? candidate : towardsCenter(anchor, offset),
      halfLength,
      halfWidth,
      orientation,
      irregularity: 0.2 + random.next() * 0.4,
    });
  }

  return shapes;
}

/** Samples uniformly along the spine instead of clustering shapes on its joints. */
function randomSpineAnchor(
  spine: readonly WorldPoint[],
  widthProfile: readonly number[],
  random: SeededRandom
): { readonly anchor: WorldPoint; readonly localWidth: number; readonly direction: number } {
  let remaining = random.next() * polylineLength(spine);
  for (let index = 1; index < spine.length; index++) {
    const from = spine[index - 1];
    const to = spine[index];
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    if (remaining > length && index < spine.length - 1) {
      remaining -= length;
      continue;
    }
    const progress = length > 0 ? Math.min(1, remaining / length) : 0;
    return {
      anchor: {
        x: from.x + (to.x - from.x) * progress,
        y: from.y + (to.y - from.y) * progress,
      },
      localWidth:
        widthProfile[index - 1] + (widthProfile[index] - widthProfile[index - 1]) * progress,
      direction: Math.atan2(to.y - from.y, to.x - from.x),
    };
  }
  return { anchor: spine[0], localWidth: widthProfile[0], direction: 0 };
}

function randomPointInside(shape: WorldShape, random: SeededRandom): WorldPoint {
  for (let attempt = 0; attempt < 16; attempt++) {
    const point = {
      x: LANDMASS_MARGIN + random.next() * (1 - 2 * LANDMASS_MARGIN),
      y: LANDMASS_MARGIN + random.next() * (1 - 2 * LANDMASS_MARGIN),
    };
    if (insideWorld(shape, point)) {
      return point;
    }
  }
  return { x: 0.5, y: 0.5 };
}

function towardsCenter(point: WorldPoint, distance: number): WorldPoint {
  const deltaX = 0.5 - point.x;
  const deltaY = 0.5 - point.y;
  const length = Math.hypot(deltaX, deltaY) || 1;
  return {
    x: point.x + (deltaX / length) * distance,
    y: point.y + (deltaY / length) * distance,
  };
}

function insideWorld(shape: WorldShape, point: WorldPoint): boolean {
  return insideWorldBy(shape, point, 0);
}

/** Whether a point lies inside the world shape, eroded by an extra margin. */
function insideWorldBy(shape: WorldShape, point: WorldPoint, extra: number): boolean {
  const scale = 1 - 2 * (LANDMASS_MARGIN + extra);
  return scale > 0 && containsWorld(shape, (2 * point.x - 1) / scale, (2 * point.y - 1) / scale);
}

function spineDistance(left: readonly WorldPoint[], right: readonly WorldPoint[]): number {
  let nearest = Infinity;
  for (const first of left) {
    for (const second of right) {
      nearest = Math.min(nearest, Math.hypot(first.x - second.x, first.y - second.y));
    }
  }
  return nearest;
}

function polylineLength(points: readonly WorldPoint[]): number {
  let length = 0;
  for (let index = 1; index < points.length; index++) {
    length += Math.hypot(
      points[index].x - points[index - 1].x,
      points[index].y - points[index - 1].y
    );
  }
  return length;
}
