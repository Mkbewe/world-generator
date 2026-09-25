import { ARCHETYPE_RECIPES } from './archetypes';
import type { ArchetypeRange, ArchetypeRecipe, CorridorKind, StructureDraft } from './draft';
import type { SeededRandom } from '../../../random/seeded-random';
import type { LandmassArchetype, LandmassEdge, LandmassNode, WorldPoint } from '../../../types';
import { distanceBetween, pointAlong, polylineLength } from '../influence';
import { scaleStructure } from '../transform';

/** Integration step of a unit corridor; dense enough for smooth control points. */
const CORRIDOR_STEP = 0.02;

/** Node count limits of a branch arm (plan §11.5). */
const MIN_BRANCH_NODES = 2;
const MAX_BRANCH_NODES = 5;

/** Control points kept per edge; enough samples preserve bent corridors. */
const MAX_CONTROL_POINTS = 6;

/** Samples closer than this to a node are the node, not control points. */
const CONTROL_ENDPOINT_GAP = CORRIDOR_STEP * 0.5;

/** Arc-length step used when measuring how tight a corridor bends. */
const SAFE_SAMPLE_STEP = 0.1;

const TAU = Math.PI * 2;

/** Builds the unit geometry of one structure from its archetype recipe. */
export function buildStructure(
  id: string,
  archetype: LandmassArchetype,
  random: SeededRandom
): StructureDraft {
  const recipe = ARCHETYPE_RECIPES[archetype];
  const corridor = buildCorridor(recipe, random);
  const main = corridorNodes(id, corridor, recipe, random);
  const branches = branchNodes(id, main.nodes, recipe, random);
  const nodes = [...main.nodes, ...branches.nodes];
  const edges = [...main.edges, ...branches.edges];

  return { id, archetype, nodes, edges };
}

/**
 * Scales the whole draft geometry around the origin, e.g. to reach the planned
 * extent. Node positions, radii and edge control points move together, so the
 * skeleton, its smoothing and the collision geometry stay consistent.
 */
export function scaleDraft(draft: StructureDraft, factor: number): StructureDraft {
  return scaleStructure(draft, factor, { x: 0, y: 0 });
}

interface Corridor {
  readonly points: readonly WorldPoint[];
  readonly closed: boolean;
  /**
   * Dense-point indexes of discrete joints. The control-point reduction
   * always keeps them, so an even thinning never irons a kink flat;
   * smooth builders leave this unset.
   */
  readonly creases?: readonly number[];
}

/**
 * Corridor builders behind the recipe kinds. The recipe selects the builder,
 * never the archetype name: a new shape is a new `corridor` value in
 * `ARCHETYPE_RECIPES`, not a branch here.
 */
const CORRIDOR_BUILDERS: Record<
  CorridorKind,
  (recipe: ArchetypeRecipe, random: SeededRandom) => Corridor
> = {
  sine: buildSineCorridor,
  angular: buildAngularCorridor,
};

/** Dense corridor of a structure, built by the strategy its recipe selects. */
function buildCorridor(recipe: ArchetypeRecipe, random: SeededRandom): Corridor {
  return CORRIDOR_BUILDERS[recipe.corridor](recipe, random);
}

/**
 * Sine corridor: the direction integrates a total turn, an oscillation and a
 * random opening angle, so one recipe covers straight ridges, gentle curves
 * and S-bends. Open by construction.
 */
function buildSineCorridor(recipe: ArchetypeRecipe, random: SeededRandom): Corridor {
  const length = sampleRange(recipe.length, random);
  const turn = sampleRange(recipe.turn, random) * (random.next() < 0.5 ? -1 : 1);
  const wobble = sampleRange(recipe.wobble, random);
  const bends = sampleRange(recipe.bends, random);
  const phase = random.next() * Math.PI * 2;
  const direction0 = random.next() * Math.PI * 2;
  const steps = Math.max(8, Math.ceil(length / CORRIDOR_STEP));
  const step = length / steps;
  const points: WorldPoint[] = [{ x: 0, y: 0 }];
  let x = 0;
  let y = 0;

  for (let index = 1; index <= steps; index++) {
    const at = index / steps;
    const direction = direction0 + turn * at + wobble * Math.sin(TAU * bends * at + phase);
    x += Math.cos(direction) * step;
    y += Math.sin(direction) * step;
    points.push({ x, y });
  }
  return { points, closed: false };
}

/**
 * Angular corridor: straight runs joined by discrete kinks instead of one
 * continuous curve — every piece keeps its heading and the whole joint angle
 * lands at once, so the axis reads as L, U or Z bars. Open by construction;
 * alternating joint signs zigzag while repeated signs box around.
 */
function buildAngularCorridor(recipe: ArchetypeRecipe, random: SeededRandom): Corridor {
  const length = sampleRange(recipe.length, random);
  const pieces = Math.max(2, Math.round(sampleRange(recipe.bends, random)));
  const weights = Array.from({ length: pieces }, () => 0.5 + random.next());
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const points: WorldPoint[] = [{ x: 0, y: 0 }];
  const creases: number[] = [];
  let x = 0;
  let y = 0;
  let direction = random.next() * Math.PI * 2;

  for (let piece = 0; piece < pieces; piece++) {
    if (piece > 0) {
      direction += (random.next() < 0.5 ? -1 : 1) * sampleRange(recipe.turn, random);
    }
    const pieceLength = (length * weights[piece]) / totalWeight;
    const steps = Math.max(2, Math.ceil(pieceLength / CORRIDOR_STEP));
    const step = pieceLength / steps;
    for (let index = 0; index < steps; index++) {
      x += Math.cos(direction) * step;
      y += Math.sin(direction) * step;
      points.push({ x, y });
    }
    if (piece < pieces - 1) {
      creases.push(points.length - 1);
    }
  }
  return { points, closed: false, creases };
}

interface RadiusShape {
  readonly taper: number;
  readonly skew: number;
  readonly variation: number;
  readonly waveA: number;
  readonly waveB: number;
  readonly frequencyA: number;
  readonly frequencyB: number;
  readonly closed: boolean;
}

/** Influence radius at a fraction of the corridor length. */
function radiusProfile(at: number, shape: RadiusShape): number {
  const ends = shape.closed ? 1 : shape.taper + (1 - shape.taper) * Math.sin(Math.PI * at);
  const skew = 1 + shape.skew * (at - 0.5) * 2;
  const wave =
    (Math.sin(Math.PI * 2 * shape.frequencyA * at + shape.waveA) +
      0.5 * Math.sin(Math.PI * 2 * shape.frequencyB * at + shape.waveB)) /
    1.5;
  return Math.max(0.05, ends * skew * (1 + shape.variation * wave));
}

function corridorNodes(
  id: string,
  corridor: Corridor,
  recipe: ArchetypeRecipe,
  random: SeededRandom
): { readonly nodes: LandmassNode[]; readonly edges: LandmassEdge[] } {
  const points = samplingPoints(corridor);
  const intendedBase = sampleRange(recipe.radius, random);
  // A corridor wider than its tightest turn would fold its own outline, so the
  // generator narrows it here instead of the painter trimming single ribs.
  // Discrete kinks keep their width: the miter is the shape, not a fold.
  const base = recipe.clampWidth ? safeCorridorRadius(points, intendedBase) : intendedBase;
  const shape: RadiusShape = {
    taper: sampleRange(recipe.taper, random),
    skew: sampleRange(recipe.skew, random),
    variation: sampleRange(recipe.variation, random),
    waveA: random.next() * Math.PI * 2,
    waveB: random.next() * Math.PI * 2,
    frequencyA: 1 + random.next() * 1.5,
    frequencyB: 1.5 + random.next() * 2,
    closed: corridor.closed,
  };
  // The recipe decides how many nodes its corridor carries: a ridge stays
  // legible with few, a wide arc needs enough to read smoothly.
  const spacing = sampleRange(recipe.spacing, random);
  const count = Math.min(
    recipe.nodes[1],
    Math.max(recipe.nodes[0], Math.round(polylineLength(points) / (base * spacing)))
  );
  const nodes: LandmassNode[] = [];
  const indices: number[] = [];

  for (let index = 0; index < count; index++) {
    const at = nodeFraction(corridor.closed, index, count);
    // The node sits on the sampled corridor point, so the control-point gap
    // filter measures the same endpoints the edges later reference.
    const pointIndex = Math.min(points.length - 1, Math.round(at * (points.length - 1)));
    nodes.push({
      id: `${id}-n${index + 1}`,
      position: points[pointIndex],
      radius: base * radiusProfile(at, shape),
    });
    indices.push(pointIndex);
  }

  const edges: LandmassEdge[] = [];
  const edgeCount = corridor.closed ? count : count - 1;
  for (let index = 0; index < edgeCount; index++) {
    const from = index;
    const to = (index + 1) % count;
    edges.push({
      id: `${id}-e${index + 1}`,
      from: nodes[from].id,
      to: nodes[to].id,
      ...controlPoints(points, indices[from], indices[to], corridor.creases ?? []),
    });
  }
  return { nodes, edges };
}

/**
 * Keeps a corridor thinner than its tightest local turn, whatever the intent.
 * The measurement runs on a coarse sampling: the outline follows the reduced
 * axis, so high-frequency wobble of the dense corridor must not shrink a
 * compact island that the preview never draws as a wiggle.
 */
function safeCorridorRadius(points: readonly WorldPoint[], intended: number): number {
  const sampled = decimate(points, SAFE_SAMPLE_STEP);
  let safe = intended;
  for (let index = 1; index < sampled.length - 1; index++) {
    const before = sampled[index - 1];
    const current = sampled[index];
    const after = sampled[index + 1];
    const first = distanceBetween(before, current);
    const second = distanceBetween(current, after);
    const opposite = distanceBetween(before, after);
    const cross = Math.abs(
      (current.x - before.x) * (after.y - before.y) - (current.y - before.y) * (after.x - before.x)
    );
    if (cross > Number.EPSILON) {
      const curvatureRadius = (first * second * opposite) / (2 * cross);
      safe = Math.min(safe, curvatureRadius * 0.38);
    }
  }
  return safe;
}

/** Points at least one arc-length step apart, first and last always kept. */
function decimate(points: readonly WorldPoint[], step: number): readonly WorldPoint[] {
  if (points.length < 3) {
    return points;
  }
  const kept: WorldPoint[] = [points[0]];
  let travelled = 0;
  for (let index = 1; index < points.length; index++) {
    travelled += distanceBetween(points[index - 1], points[index]);
    if (travelled >= step || index === points.length - 1) {
      kept.push(points[index]);
      travelled = 0;
    }
  }
  return kept;
}

/** Grows branch corridors from interior nodes of the main corridor. */
function branchNodes(
  id: string,
  nodes: readonly LandmassNode[],
  recipe: ArchetypeRecipe,
  random: SeededRandom
): { readonly nodes: LandmassNode[]; readonly edges: LandmassEdge[] } {
  const count = Math.round(sampleRange(recipe.branches, random));
  const branchNodes: LandmassNode[] = [];
  const branchEdges: LandmassEdge[] = [];
  if (count <= 0 || nodes.length < 2) {
    return { nodes: branchNodes, edges: branchEdges };
  }
  const total = polylineLength(nodes.map(node => node.position));
  // Interior nodes parent side arms; a two-node corridor has none, so the arm
  // grows from its start instead and still sticks out sideways as an L.
  const availableParents =
    nodes.length >= 3 ? Array.from({ length: nodes.length - 2 }, (_, index) => index + 1) : [0];

  for (let branch = 0; branch < count && availableParents.length > 0; branch++) {
    const parentIndex = availableParents.splice(
      Math.floor(random.next() * availableParents.length),
      1
    )[0];
    const parent = nodes[parentIndex];
    const next = nodes[parentIndex + 1];
    const baseDirection = Math.atan2(
      next.position.y - parent.position.y,
      next.position.x - parent.position.x
    );
    const direction =
      baseDirection + (random.next() < 0.5 ? -1 : 1) * sampleRange(recipe.branchAngle, random);
    const length = total * (0.3 + random.next() * 0.25);
    const radius = parent.radius * (0.6 + random.next() * 0.3);
    const taper = 0.35 + random.next() * 0.3;
    const turn = (random.next() - 0.5) * 1.2;
    const points = straightPath(parent.position, direction, turn, length);
    const spacing = sampleRange(recipe.spacing, random);
    const nodeCount = Math.max(
      MIN_BRANCH_NODES,
      Math.min(MAX_BRANCH_NODES, Math.round(length / (radius * spacing)))
    );
    const indices: number[] = [];

    for (let index = 0; index < nodeCount; index++) {
      const at = (index + 1) / nodeCount;
      branchNodes.push({
        id: `${id}-b${branch + 1}n${index + 1}`,
        position: pointAlong(points, at).point,
        radius: radius * (taper + (1 - taper) * Math.sin(Math.PI * at)),
      });
      indices.push(Math.min(points.length - 1, Math.round(at * (points.length - 1))));
    }

    branchEdges.push({
      id: `${id}-b${branch + 1}e1`,
      from: parent.id,
      to: branchNodes[branchNodes.length - nodeCount].id,
      ...controlPoints(points, 0, indices[0]),
    });
    for (let index = 1; index < nodeCount; index++) {
      branchEdges.push({
        id: `${id}-b${branch + 1}e${index + 1}`,
        from: branchNodes[branchNodes.length - nodeCount + index - 1].id,
        to: branchNodes[branchNodes.length - nodeCount + index].id,
        ...controlPoints(points, indices[index - 1], indices[index]),
      });
    }
  }
  return { nodes: branchNodes, edges: branchEdges };
}

/** Dense points of a straight-ish branch path that starts at `origin`. */
function straightPath(
  origin: WorldPoint,
  direction: number,
  turn: number,
  length: number
): WorldPoint[] {
  const steps = Math.max(4, Math.ceil(length / CORRIDOR_STEP));
  const step = length / steps;
  const points: WorldPoint[] = [{ ...origin }];
  let x = origin.x;
  let y = origin.y;

  for (let index = 1; index <= steps; index++) {
    const heading = direction + turn * (index / steps);
    x += Math.cos(heading) * step;
    y += Math.sin(heading) * step;
    points.push({ x, y });
  }
  return points;
}

/**
 * Reduces the dense corridor between two nodes to a few control points.
 * Creases — discrete joints the builder marked as load-bearing — always
 * survive the reduction, so an even thinning never irons a kink flat.
 */
function controlPoints(
  points: readonly WorldPoint[],
  fromIndex: number,
  toIndex: number,
  creases: readonly number[] = []
): { readonly controlPoints?: readonly WorldPoint[] } {
  const span: number[] = [];
  if (toIndex > fromIndex) {
    for (let index = fromIndex + 1; index < toIndex; index++) {
      span.push(index);
    }
  } else {
    for (let index = fromIndex + 1; index < points.length; index++) {
      span.push(index);
    }
    for (let index = 1; index < toIndex; index++) {
      span.push(index);
    }
  }
  const fromPoint = points[fromIndex];
  const toPoint = points[toIndex];
  const forced = new Set(span.filter(index => creases.includes(index)));
  const rest = span.filter(
    index =>
      !forced.has(index) &&
      distanceBetween(points[index], fromPoint) > CONTROL_ENDPOINT_GAP &&
      distanceBetween(points[index], toPoint) > CONTROL_ENDPOINT_GAP
  );
  if (forced.size === 0 && rest.length === 0) {
    return {};
  }

  const count = Math.min(MAX_CONTROL_POINTS, rest.length);
  const kept = new Set<number>(forced);
  for (let index = 1; index <= count; index++) {
    const picked = rest[Math.floor((rest.length * index) / (count + 1))];
    if (picked !== undefined) {
      kept.add(picked);
    }
  }
  return { controlPoints: span.filter(index => kept.has(index)).map(index => points[index]) };
}

/**
 * Position of one node along its corridor. An open corridor with a single
 * node keeps the middle, so a round island never divides by zero.
 */
function nodeFraction(closed: boolean, index: number, count: number): number {
  if (closed) {
    return index / count;
  }
  if (count <= 1) {
    return 0.5;
  }
  return index / (count - 1);
}

/** Closed corridors wrap; the repeated first point is only for arc-length sampling. */
function samplingPoints(corridor: Corridor): WorldPoint[] {
  if (!corridor.closed || corridor.points.length === 0) {
    return [...corridor.points];
  }
  return [...corridor.points, corridor.points[0]];
}

function sampleRange(range: ArchetypeRange, random: SeededRandom): number {
  return range[0] + random.next() * (range[1] - range[0]);
}
