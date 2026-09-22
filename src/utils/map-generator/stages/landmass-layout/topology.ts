import { ARCHETYPE_RECIPES } from './archetypes';
import { distanceBetween, pointAlong, polylineLength } from './geometry';
import type { ArchetypeRange, ArchetypeRecipe, StructureDraft } from './types';
import type { SeededRandom } from '../../random/seeded-random';
import type { LandmassArchetype, LandmassEdge, LandmassNode, WorldPoint } from '../../types';

/** Integration step of a unit corridor; dense enough for smooth control points. */
const CORRIDOR_STEP = 0.02;

/** Node spacing along a corridor, as a multiple of the local radius. */
const NODE_SPACING = 1.5;

/** Node count limits of the main corridor. */
const MIN_NODES = 2;
const MAX_NODES = 14;

/** Control points kept per edge; the dense corridor is reduced to this many. */
const MAX_CONTROL_POINTS = 2;

/** A turn this large closes the corridor into a ring. */
const CLOSED_TURN = 6.1;

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

  return { id, archetype, nodes, edges, area: estimateArea(nodes, edges) };
}

/** Approximate footprint area of a node-and-edge graph. */
export function estimateArea(
  nodes: readonly LandmassNode[],
  edges: readonly LandmassEdge[]
): number {
  const byId = new Map(nodes.map(node => [node.id, node]));
  const degree = new Map<string, number>();
  let area = 0;

  for (const edge of edges) {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (!from || !to) {
      continue;
    }
    area += distanceBetween(from.position, to.position) * (from.radius + to.radius);
    degree.set(edge.from, (degree.get(edge.from) ?? 0) + 1);
    degree.set(edge.to, (degree.get(edge.to) ?? 0) + 1);
  }
  for (const node of nodes) {
    if ((degree.get(node.id) ?? 0) <= 1) {
      area += Math.PI * node.radius * node.radius * 0.5;
    }
  }
  return area;
}

/** Scales the positions and radii of a draft, e.g. to fit its area budget. */
export function scaleDraft(draft: StructureDraft, factor: number): StructureDraft {
  return {
    ...draft,
    nodes: draft.nodes.map(node => ({
      ...node,
      position: { x: node.position.x * factor, y: node.position.y * factor },
      radius: node.radius * factor,
    })),
    area: draft.area * factor * factor,
  };
}

interface Corridor {
  readonly points: readonly WorldPoint[];
  readonly closed: boolean;
}

/**
 * Dense corridor of a structure: the direction integrates a total turn, an
 * oscillation and a random opening angle, so one recipe covers straight ridges,
 * gentle curves, S-bends and rings.
 */
function buildCorridor(recipe: ArchetypeRecipe, random: SeededRandom): Corridor {
  const length = sampleRange(recipe.length, random);
  const turn = sampleRange(recipe.turn, random) * (random.next() < 0.5 ? -1 : 1);
  const wobble = sampleRange(recipe.wobble, random);
  const bends = sampleRange(recipe.bends, random);
  const phase = random.next() * Math.PI * 2;
  const direction0 = random.next() * Math.PI * 2;
  const closed = Math.abs(turn) >= CLOSED_TURN;
  const steps = Math.max(8, Math.ceil(length / CORRIDOR_STEP));
  const step = length / steps;
  const points: WorldPoint[] = [{ x: 0, y: 0 }];
  let x = 0;
  let y = 0;

  for (let index = 1; index <= steps; index++) {
    const at = index / steps;
    const direction = direction0 + turn * at + wobble * Math.sin(Math.PI * 2 * bends * at + phase);
    x += Math.cos(direction) * step;
    y += Math.sin(direction) * step;
    points.push({ x, y });
  }
  if (closed) {
    // A ring has to meet itself; the oscillation leaves a small gap otherwise.
    points[points.length - 1] = points[0];
  }
  return { points, closed };
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
  const points = corridor.points;
  const base = sampleRange(recipe.radius, random);
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
  const count = Math.min(
    MAX_NODES,
    Math.max(MIN_NODES, Math.round(polylineLength(points) / (base * NODE_SPACING)))
  );
  const nodes: LandmassNode[] = [];
  const indices: number[] = [];

  for (let index = 0; index < count; index++) {
    const at = corridor.closed ? index / count : index / (count - 1);
    nodes.push({
      id: `${id}-n${index + 1}`,
      position: pointAlong(points, at).point,
      radius: base * radiusProfile(at, shape),
    });
    indices.push(Math.min(points.length - 1, Math.round(at * (points.length - 1))));
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
      ...controlPoints(points, indices[from], indices[to]),
    });
  }
  return { nodes, edges };
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
  if (count <= 0 || nodes.length < 3) {
    return { nodes: branchNodes, edges: branchEdges };
  }
  const total = polylineLength(nodes.map(node => node.position));

  for (let branch = 0; branch < count; branch++) {
    const parentIndex = 1 + Math.floor(random.next() * (nodes.length - 2));
    const parent = nodes[parentIndex];
    const next = nodes[parentIndex + 1];
    const baseDirection = Math.atan2(
      next.position.y - parent.position.y,
      next.position.x - parent.position.x
    );
    const direction = baseDirection + (random.next() < 0.5 ? -1 : 1) * (0.7 + random.next() * 0.6);
    const length = total * (0.3 + random.next() * 0.25);
    const radius = parent.radius * (0.6 + random.next() * 0.3);
    const taper = 0.35 + random.next() * 0.3;
    const turn = (random.next() - 0.5) * 1.2;
    const points = straightPath(parent.position, direction, turn, length);
    const nodeCount = Math.max(2, Math.min(6, Math.round(length / (radius * NODE_SPACING))));
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

/** Reduces the dense corridor between two nodes to a few control points. */
function controlPoints(
  points: readonly WorldPoint[],
  fromIndex: number,
  toIndex: number
): { readonly controlPoints?: readonly WorldPoint[] } {
  const between: WorldPoint[] = [];
  if (toIndex > fromIndex) {
    for (let index = fromIndex + 1; index < toIndex; index++) {
      between.push(points[index]);
    }
  } else {
    for (let index = fromIndex + 1; index < points.length; index++) {
      between.push(points[index]);
    }
    for (let index = 1; index < toIndex; index++) {
      between.push(points[index]);
    }
  }
  if (between.length === 0) {
    return {};
  }

  const kept: WorldPoint[] = [];
  for (let index = 1; index <= MAX_CONTROL_POINTS; index++) {
    kept.push(between[Math.floor((between.length * index) / (MAX_CONTROL_POINTS + 1))]);
  }
  return { controlPoints: kept };
}

function sampleRange(range: ArchetypeRange, random: SeededRandom): number {
  return range[0] + random.next() * (range[1] - range[0]);
}
