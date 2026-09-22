import {
  ARCHETYPE_RECIPES,
  type ArchetypeArc,
  type ArchetypeArcSegment,
  type ArchetypeBar,
  type ArchetypeRange,
  type ArchetypeRecipe,
  LANDMASS_ARCHETYPES,
} from './landmass-archetypes';
import { LANDMASS_GROUP_DISTANCE, STRUCTURE_GAP } from './landmass-defaults';
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

/** Shrink steps tried at an anchor until the structure fits the free space. */
const PLACEMENT_SHRINKS = [1, 0.85, 0.7, 0.55, 0.42, 0.32, 0.24];

/** Rotations tried per anchor, so a shape can slide past its neighbours. */
const PLACEMENT_ROTATIONS = 6;

/** Share of the outline that must stay inside the world; the coast may spill over. */
const INSIDE_OUTLINE_SHARE = 0.5;

/** Anchors generated per structure, so there is room to avoid a crowded spot. */
const ANCHOR_HEADROOM = 1.4;

/** Jitter of an anchor, as a fraction of its grid cell, so the lattice is not visible. */
const ANCHOR_JITTER = 0.6;

/** Step of the sampled spine distance, fine enough for the required gap. */
const SPINE_SAMPLE_STEP = 0.01;

/** Samples around an attached shape, so the placement check sees its outline. */
const SHAPE_OUTLINE_SAMPLES = 12;

/** Fillet radius as a fraction of the local half-width at a bend. */
const FILLET_RADIUS = 0.9;

/** Angular step between the spine points of an arc, fine enough to read as a curve. */
const ARC_STEP = 0.35;

/** Scales both ends of a range. */
function scaleRange(range: ArchetypeRange, scale: number): ArchetypeRange {
  return [range[0] * scale, range[1] * scale];
}

/** Peninsula and bay counts of a recipe that does not override them. */
const DEFAULT_SHAPE_COUNTS = {
  positive: [1, 2],
  negative: [0, 2],
} as const;

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
 * Builds one structure from the configuration and the deterministic stream. The
 * structure is centred on an even anchor grid over the world, starting from the
 * anchor farthest from the placed ones, so the layout spreads to the coast
 * instead of piling up in the middle. At every shrink step the anchors nearest
 * the start are tried, each with several rotations; the structure shrinks only
 * when no anchor accepts it. A structure may spill over the coast as long as
 * most of its outline stays inside the world.
 */
export function createStructure(
  index: number,
  config: LandmassConfig,
  shape: WorldShape,
  random: SeededRandom,
  placed: readonly StructureSeed[] = [],
  onProgress?: (progress: number) => void
): StructureSeed {
  const recipe = ARCHETYPE_RECIPES[pickArchetype(config.archetypes, random)];
  const base = sampleRange(recipe.width, random) * config.size;
  const taper = sampleRange(recipe.taper, random);
  const { offsets, handedness } = createSpineOffsets(recipe, config.size, random);
  const prefix = `landmass-${index + 1}`;
  const unit = buildStructure(
    prefix,
    recipe,
    offsets,
    base,
    taper,
    handedness,
    config,
    shape,
    random
  );
  const centre = structureCentre(unit);
  const anchors = createAnchors(shape, config.count, random);
  const start = freeAnchor(anchors, placed, random);
  const order = [...anchors].sort(
    (left, right) => anchorDistance(left, start) - anchorDistance(right, start)
  );
  const occupied = placed.map(outlineOf);
  const total = PLACEMENT_SHRINKS.length * order.length * PLACEMENT_ROTATIONS;
  let attempt = 0;
  let roomiest: { structure: StructureSeed; clearance: number } | undefined;

  for (const shrink of PLACEMENT_SHRINKS) {
    for (const anchor of order) {
      for (let step = 0; step < PLACEMENT_ROTATIONS; step++) {
        const rotation = (step / PLACEMENT_ROTATIONS) * Math.PI * 2;
        const candidate = transformStructure(unit, centre, anchor, rotation, shrink);
        attempt++;
        onProgress?.(attempt / total);
        if (!outlineInsideEnough(candidate, shape) || nestlesInHull(candidate, occupied)) {
          continue;
        }
        const clearance = clearanceFrom(candidate, occupied);
        if (clearance >= STRUCTURE_GAP) {
          return candidate;
        }
        if (!roomiest || clearance > roomiest.clearance) {
          roomiest = { structure: candidate, clearance };
        }
      }
    }
  }

  // A crowded world takes the roomiest candidate found, or the last anchor.
  const smallest = PLACEMENT_SHRINKS[PLACEMENT_SHRINKS.length - 1];
  return roomiest?.structure ?? transformStructure(unit, centre, start, 0, smallest);
}

/**
 * Even grid of anchors over the world, each one nudged inside its cell, so
 * structures start spread out and can reach the coast and the poles instead of
 * clustering in the middle of the map, without the lattice showing through.
 */
function createAnchors(shape: WorldShape, count: number, random: SeededRandom): WorldPoint[] {
  const columns = Math.max(2, Math.ceil(Math.sqrt(count * ANCHOR_HEADROOM)));
  const cell = 1 / columns;
  const anchors: WorldPoint[] = [];
  for (let row = 0; row < columns; row++) {
    for (let column = 0; column < columns; column++) {
      const point = {
        x: (column + 0.5 + (random.next() - 0.5) * ANCHOR_JITTER) * cell,
        y: (row + 0.5 + (random.next() - 0.5) * ANCHOR_JITTER) * cell,
      };
      if (insideWorld(shape, point)) {
        anchors.push(point);
      }
    }
  }
  return anchors.length > 0 ? anchors : [{ x: 0.5, y: 0.5 }];
}

function anchorDistance(left: WorldPoint, right: WorldPoint): number {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

/**
 * Anchor farthest from every structure placed so far, so consecutive islands
 * fill the empty stretches of the map instead of stacking next to each other.
 * A small random handicap keeps two equally free spots from always resolving
 * the same way, which used to bias the layout towards one corner of the map.
 */
function freeAnchor(
  anchors: readonly WorldPoint[],
  placed: readonly StructureSeed[],
  random: SeededRandom
): WorldPoint {
  let best = anchors[0];
  let bestScore = -Infinity;
  for (const anchor of anchors) {
    let nearest = Infinity;
    for (const structure of placed) {
      nearest = Math.min(nearest, anchorDistance(anchor, structureCentre(structure)));
    }
    const score = nearest * (0.8 + random.next() * 0.4);
    if (score > bestScore) {
      bestScore = score;
      best = anchor;
    }
  }
  return best;
}

/** Centre of the structure's spine bounds, used to pin it onto an anchor. */
function structureCentre(structure: StructureSeed): WorldPoint {
  const bounds = spineBounds(structure.spine);
  return { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
}

/** Moves, rotates and scales a unit structure so its centre sits on an anchor. */
function transformStructure(
  structure: StructureSeed,
  centre: WorldPoint,
  anchor: WorldPoint,
  rotation: number,
  scale: number
): StructureSeed {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const move = (point: WorldPoint): WorldPoint => {
    const x = (point.x - centre.x) * scale;
    const y = (point.y - centre.y) * scale;
    return { x: anchor.x + x * cos - y * sin, y: anchor.y + x * sin + y * cos };
  };
  const transformShape = (land: LandShape): LandShape => ({
    ...land,
    center: move(land.center),
    halfLength: land.halfLength * scale,
    halfWidth: land.halfWidth * scale,
    orientation: land.orientation + rotation,
  });

  return {
    spine: structure.spine.map(move),
    widthProfile: structure.widthProfile.map(width => width * scale),
    orientation: structure.orientation + rotation,
    irregularity: structure.irregularity,
    positiveShapes: structure.positiveShapes.map(transformShape),
    negativeShapes: structure.negativeShapes.map(transformShape),
  };
}

/**
 * Whether enough of the coast stays inside the world; the rest may spill over
 * the edge, where the world mask cuts it off.
 */
function outlineInsideEnough(structure: StructureSeed, shape: WorldShape): boolean {
  let samples = 0;
  let inside = 0;
  for (const [index, point] of structure.spine.entries()) {
    const width = structure.widthProfile[index];
    const normal = spineNormal(structure.spine, index);
    for (const offset of [0, -width, width]) {
      samples++;
      const coast = { x: point.x + normal.x * offset, y: point.y + normal.y * offset };
      if (insideWorld(shape, coast)) {
        inside++;
      }
    }
  }
  for (const land of structure.positiveShapes) {
    samples += SHAPE_OUTLINE_SAMPLES;
    inside += shapeOutlineInside(land, shape);
  }
  return inside >= samples * INSIDE_OUTLINE_SHARE;
}

/** Unit normal of the spine at a vertex, taken from the neighbouring points. */
function spineNormal(spine: readonly WorldPoint[], index: number): WorldPoint {
  const from = spine[Math.max(0, index - 1)];
  const to = spine[Math.min(spine.length - 1, index + 1)];
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  return { x: -(to.y - from.y) / length, y: (to.x - from.x) / length };
}

/** How many samples of an ellipse outline lie inside the world. */
function shapeOutlineInside(land: LandShape, shape: WorldShape): number {
  const cos = Math.cos(land.orientation);
  const sin = Math.sin(land.orientation);
  let inside = 0;
  for (let step = 0; step < SHAPE_OUTLINE_SAMPLES; step++) {
    const angle = (step / SHAPE_OUTLINE_SAMPLES) * Math.PI * 2;
    const along = Math.cos(angle) * land.halfLength;
    const across = Math.sin(angle) * land.halfWidth;
    const point = {
      x: land.center.x + along * cos - across * sin,
      y: land.center.y + along * sin + across * cos,
    };
    if (insideWorld(shape, point)) {
      inside++;
    }
  }
  return inside;
}

/** Placement data of a placed structure, computed once for all candidates. */
interface PlacedOutline {
  readonly sampled: readonly WorldPoint[];
  readonly bounds: SpineBounds;
  readonly reach: number;
  /** Convex hull of the spine and its shapes; covers bays and lagoons. */
  readonly hull: readonly WorldPoint[];
  readonly hullBounds: SpineBounds;
}

/** Precomputes what every candidate needs to know about a placed structure. */
function outlineOf(structure: StructureSeed): PlacedOutline {
  const sampled = sampleSpine(structure.spine);
  const hull = convexHull([
    ...structure.spine,
    ...structure.positiveShapes.map(shape => shape.center),
  ]);
  return {
    sampled,
    bounds: spineBounds(structure.spine),
    reach: structureReach(structure, sampled),
    hull,
    hullBounds: spineBounds(hull),
  };
}

/** Whether a candidate dips into a placed structure's bay or lagoon. */
function nestlesInHull(structure: StructureSeed, placed: readonly PlacedOutline[]): boolean {
  const bounds = spineBounds(structure.spine);
  return placed.some(other => {
    if (boundsGap(bounds, other.hullBounds) > 0) {
      return false;
    }
    return structure.spine.some(point => insideHull(other.hull, point));
  });
}

/** Convex hull of the given points in counter-clockwise order; monotone chain. */
function convexHull(points: readonly WorldPoint[]): WorldPoint[] {
  const sorted = [...points].sort((left, right) => left.x - right.x || left.y - right.y);
  if (sorted.length < 3) {
    return sorted;
  }
  const cross = (origin: WorldPoint, left: WorldPoint, right: WorldPoint): number =>
    (left.x - origin.x) * (right.y - origin.y) - (left.y - origin.y) * (right.x - origin.x);
  const half = (input: readonly WorldPoint[]): WorldPoint[] => {
    const chain: WorldPoint[] = [];
    for (const point of input) {
      while (
        chain.length >= 2 &&
        cross(chain[chain.length - 2], chain[chain.length - 1], point) <= 0
      ) {
        chain.pop();
      }
      chain.push(point);
    }
    return chain;
  };

  const lower = half(sorted);
  const upper = half([...sorted].reverse());
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** Whether a point lies inside a convex polygon given in order. */
function insideHull(hull: readonly WorldPoint[], point: WorldPoint): boolean {
  if (hull.length < 3) {
    return false;
  }
  let side = 0;
  for (let index = 0; index < hull.length; index++) {
    const from = hull[index];
    const to = hull[(index + 1) % hull.length];
    const cross = (to.x - from.x) * (point.y - from.y) - (to.y - from.y) * (point.x - from.x);
    if (cross === 0) {
      continue;
    }
    const current = Math.sign(cross);
    if (side !== 0 && current !== side) {
      return false;
    }
    side = current;
  }
  return true;
}

/** Smallest gap between a candidate structure and the placed ones; negative means overlap. */
function clearanceFrom(structure: StructureSeed, placed: readonly PlacedOutline[]): number {
  const bounds = spineBounds(structure.spine);
  const sampled = sampleSpine(structure.spine);
  const reach = structureReach(structure, sampled);
  let clearance = Infinity;
  for (const other of placed) {
    const required = reach + other.reach;
    if (boundsGap(bounds, other.bounds) > required + STRUCTURE_GAP) {
      continue;
    }
    clearance = Math.min(clearance, sampledSpineDistance(sampled, other.sampled) - required);
  }
  return clearance;
}

/** Farthest outline point of a structure from its spine. */
function structureReach(structure: StructureSeed, sampled: readonly WorldPoint[]): number {
  let reach = 0;
  for (const width of structure.widthProfile) {
    reach = Math.max(reach, width);
  }
  for (const shape of structure.positiveShapes) {
    reach = Math.max(
      reach,
      sampledSpineDistance([shape.center], sampled) + Math.max(shape.halfLength, shape.halfWidth)
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

/** Nearest distance between two sampled spines, fine enough for the required gap. */
function sampledSpineDistance(left: readonly WorldPoint[], right: readonly WorldPoint[]): number {
  let nearest = Infinity;
  for (const first of left) {
    for (const second of right) {
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

/** Completes a unit spine with its width profile, shapes and shelf-less metadata. */
function buildStructure(
  prefix: string,
  recipe: ArchetypeRecipe,
  spine: readonly WorldPoint[],
  base: number,
  taper: number,
  handedness: number,
  config: LandmassConfig,
  shape: WorldShape,
  random: SeededRandom
): StructureSeed {
  // A two-point recipe needs a midpoint so its profile can reach the sampled
  // base width instead of staying at the tapered end width everywhere.
  const outlineSpine =
    spine.length === 2
      ? [spine[0], { x: (spine[0].x + spine[1].x) / 2, y: (spine[0].y + spine[1].y) / 2 }, spine[1]]
      : spine;
  const spineLength = polylineLength(outlineSpine);
  const skew = recipe.widthSkew ? sampleRange(recipe.widthSkew, random) : 0;
  let traversed = 0;
  const widthProfile = outlineSpine.map((point, index) => {
    if (index > 0) {
      traversed += Math.hypot(
        point.x - outlineSpine[index - 1].x,
        point.y - outlineSpine[index - 1].y
      );
    }
    const position = spineLength > 0 ? traversed / spineLength : 0.5;
    const sine = taper + (1 - taper) * Math.sin(Math.PI * position);
    // The skew thickens one end at the other's expense, so the two arms of a U
    // can differ in width; the middle stays at the base width.
    const profile = base * sine * (1 + skew * (position - 0.5) * 2);
    // A jittered profile makes the outline wavy, with thicker and thinner
    // stretches and uneven ends, while smooth archetypes keep the plain sine.
    return recipe.widthJitter ? profile * sampleRange(recipe.widthJitter, random) : profile;
  });
  const last = outlineSpine[outlineSpine.length - 1];
  const shapes = recipe.shapes ?? DEFAULT_SHAPE_COUNTS;
  const shapeScale = recipe.shapeScale ? sampleRange(recipe.shapeScale, random) : 1;

  return {
    spine: outlineSpine,
    widthProfile,
    orientation: Math.atan2(last.y - outlineSpine[0].y, last.x - outlineSpine[0].x),
    irregularity: config.irregularity,
    positiveShapes: [
      ...createShapes(
        `${prefix}-peninsula`,
        shape,
        outlineSpine,
        widthProfile,
        random,
        shapes.positive[0],
        shapes.positive[1],
        {
          // Sits deep enough in the body that even a large shape stays attached.
          coast: 0.6,
          reach: 0.1,
          length: scaleRange([0.3, 0.55], shapeScale),
          width: scaleRange([0.25, 0.4], shapeScale),
        }
      ),
      ...createBars(prefix, recipe.bars ?? [], spine, base, handedness, random),
      ...createFillets(prefix, outlineSpine, widthProfile),
    ],
    negativeShapes: createShapes(
      `${prefix}-bay`,
      shape,
      outlineSpine,
      widthProfile,
      random,
      shapes.negative[0],
      shapes.negative[1],
      {
        coast: 1.08,
        reach: 0.15,
        length: scaleRange([0.35, 0.6], shapeScale),
        width: scaleRange([0.22, 0.36], shapeScale),
      }
    ),
  };
}

/** Rounds the inner side of a bend, where two capsules meet under an angle. */
function createFillets(
  prefix: string,
  spine: readonly WorldPoint[],
  widthProfile: readonly number[]
): LandShape[] {
  const fillets: LandShape[] = [];
  for (let index = 1; index < spine.length - 1; index++) {
    const width = widthProfile[index] * FILLET_RADIUS;
    fillets.push({
      id: `${prefix}-fillet-${index}`,
      center: spine[index],
      halfLength: width,
      halfWidth: width,
      orientation: 0,
      irregularity: 0,
    });
  }
  return fillets;
}

/** Deterministic branches of the recipe: crossbars and stems a spine cannot draw. */
function createBars(
  prefix: string,
  bars: readonly ArchetypeBar[],
  spine: readonly WorldPoint[],
  spineWidth: number,
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
    const halfLength = sampleRange(bar.length, random) * spineWidth;
    const bias = sampleRange(bar.bias, random) * halfLength;
    return {
      id: `${prefix}-bar-${index + 1}`,
      center: {
        x: center.x + Math.cos(orientation) * bias,
        y: center.y + Math.sin(orientation) * bias,
      },
      halfLength,
      halfWidth: sampleRange(bar.width, random) * spineWidth,
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
  if ('arc' in recipe) {
    const handedness = random.next() < 0.5 ? -1 : 1;
    return { offsets: createArcOffsets(recipe.arc, size, random), handedness };
  }

  if ('arcs' in recipe) {
    const handedness = random.next() < 0.5 ? -1 : 1;
    return { offsets: createArcsOffsets(recipe.arcs, size, random, handedness), handedness };
  }

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

/**
 * Spine of an arc-shaped structure: points swept around an ellipse, closed into
 * a ring by a full turn. A recipe may grow a straight tip on each end, each
 * leaving the arc under its own sampled turn, so the two ends of a C bend
 * different ways.
 */
function createArcOffsets(arc: ArchetypeArc, size: number, random: SeededRandom): WorldPoint[] {
  const sweep = sampleRange(arc.sweep, random);
  const radius = sampleRange(arc.radius, random) * size;
  const flatten = sampleRange(arc.flatten, random);
  const rotation = random.next() * Math.PI * 2;
  const start = random.next() * Math.PI * 2;
  const steps = Math.max(2, Math.ceil(sweep / ARC_STEP));
  const points = Array.from({ length: steps + 1 }, (_, index) =>
    arcPoint(start + (sweep * index) / steps, radius, flatten, rotation)
  );

  if (!arc.tips) {
    return points;
  }

  const tipLength = sampleRange(arc.tips.length, random) * radius;
  const headTurn = sampleRange(arc.tips.turns[0], random);
  const tailTurn = sampleRange(arc.tips.turns[1], random);
  const first = points[0];
  const last = points[points.length - 1];
  const headDirection = arcDirection(start, flatten, rotation) + headTurn;
  const tailDirection = arcDirection(start + sweep, flatten, rotation) + tailTurn;
  return [
    {
      x: first.x - Math.cos(headDirection) * tipLength,
      y: first.y - Math.sin(headDirection) * tipLength,
    },
    ...points,
    {
      x: last.x + Math.cos(tailDirection) * tipLength,
      y: last.y + Math.sin(tailDirection) * tipLength,
    },
  ];
}

/** Point of the rotated ellipse at the given sweep angle. */
function arcPoint(angle: number, radius: number, flatten: number, rotation: number): WorldPoint {
  const along = Math.cos(angle) * radius;
  const across = Math.sin(angle) * radius * flatten;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return { x: along * cos - across * sin, y: along * sin + across * cos };
}

/** Travel direction of the ellipse at the given sweep angle. */
function arcDirection(angle: number, flatten: number, rotation: number): number {
  return rotation + Math.atan2(Math.cos(angle) * flatten, -Math.sin(angle));
}

/**
 * Spine of a serpentine structure: circular arcs chained end to end, each one
 * starting tangent to the previous, so the bends read as one smooth curve
 * instead of the corners a polyline would leave.
 */
function createArcsOffsets(
  arcs: readonly ArchetypeArcSegment[],
  size: number,
  random: SeededRandom,
  handedness: number
): WorldPoint[] {
  const points: WorldPoint[] = [{ x: 0, y: 0 }];
  let direction = random.next() * Math.PI * 2;

  for (const arc of arcs) {
    const sweep = sampleRange(arc.sweep, random) * handedness;
    const radius = sampleRange(arc.radius, random) * size;
    const steps = Math.max(2, Math.ceil(Math.abs(sweep) / ARC_STEP));
    // The center sits on the side the arc turns towards, so a negative sweep
    // bends the other way instead of retracing the same circle backwards.
    const side = Math.sign(sweep) || 1;
    const start = points[points.length - 1];
    const center = {
      x: start.x - side * Math.sin(direction) * radius,
      y: start.y + side * Math.cos(direction) * radius,
    };
    for (let step = 1; step <= steps; step++) {
      const angle = direction + (sweep * step) / steps;
      points.push({
        x: center.x + side * Math.sin(angle) * radius,
        y: center.y - side * Math.cos(angle) * radius,
      });
    }
    direction += sweep;
  }

  return points;
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
  return containsWorld(shape, 2 * point.x - 1, 2 * point.y - 1);
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
