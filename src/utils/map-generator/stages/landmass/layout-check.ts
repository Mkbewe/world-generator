import { structureDistance } from './collision';
import { insideWorldShare, type WorldSampler } from './mask-sampler';
import type { GeologicalStructure, LandmassLayout } from '../../types';

/** Whether unknown data is a layout that passes every model invariant. */
export function isLandmassLayout(value: unknown): value is LandmassLayout {
  try {
    validateLayout(value as LandmassLayout);
    return true;
  } catch {
    return false;
  }
}

/** Throws when a layout breaks the node-and-edge invariants. */
export function validateLayout(layout: LandmassLayout): void {
  const shelfIds = new Set<string>();
  for (const shelf of layout.shelves) {
    if (shelfIds.has(shelf.id)) {
      throw new Error(`Duplicate shelf id "${shelf.id}".`);
    }
    shelfIds.add(shelf.id);
  }

  const structureIds = new Set<string>();
  for (const structure of layout.structures) {
    if (structureIds.has(structure.id)) {
      throw new Error(`Duplicate structure id "${structure.id}".`);
    }
    structureIds.add(structure.id);
    validateStructure(structure, shelfIds);
  }
}

function validateStructure(structure: GeologicalStructure, shelfIds: ReadonlySet<string>): void {
  if (!shelfIds.has(structure.shelfId)) {
    throw new Error(`Unknown shelf "${structure.shelfId}" for "${structure.id}".`);
  }
  if (structure.nodes.length < 2) {
    throw new Error(`Structure "${structure.id}" needs at least two nodes.`);
  }

  const nodeIds = new Set<string>();
  for (const node of structure.nodes) {
    if (nodeIds.has(node.id)) {
      throw new Error(`Duplicate node id "${node.id}".`);
    }
    nodeIds.add(node.id);
    if (!Number.isFinite(node.position.x) || !Number.isFinite(node.position.y)) {
      throw new Error(`Node "${node.id}" has invalid coordinates.`);
    }
    if (!Number.isFinite(node.radius) || !(node.radius > 0)) {
      throw new Error(`Node "${node.id}" has a non-positive radius.`);
    }
  }

  const edgeIds = new Set<string>();
  const neighbours = new Map<string, string[]>();
  for (const edge of structure.edges) {
    if (edgeIds.has(edge.id)) {
      throw new Error(`Duplicate edge id "${edge.id}".`);
    }
    edgeIds.add(edge.id);
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
      throw new Error(`Edge "${edge.id}" references an unknown node.`);
    }
    if (edge.from === edge.to) {
      throw new Error(`Edge "${edge.id}" connects a node to itself.`);
    }
    for (const point of edge.controlPoints ?? []) {
      if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
        throw new Error(`Edge "${edge.id}" has an invalid control point.`);
      }
    }
    neighbours.set(edge.from, [...(neighbours.get(edge.from) ?? []), edge.to]);
    neighbours.set(edge.to, [...(neighbours.get(edge.to) ?? []), edge.from]);
  }

  if (!isConnected(structure, neighbours)) {
    throw new Error(`Structure "${structure.id}" is not connected.`);
  }
}

/** Whether every node is reachable from the first one. */
function isConnected(
  structure: GeologicalStructure,
  neighbours: ReadonlyMap<string, readonly string[]>
): boolean {
  const start = structure.nodes[0].id;
  const seen = new Set<string>([start]);
  const stack = [start];

  while (stack.length > 0) {
    const current = stack.pop();
    for (const neighbour of (current ? neighbours.get(current) : undefined) ?? []) {
      if (!seen.has(neighbour)) {
        seen.add(neighbour);
        stack.push(neighbour);
      }
    }
  }
  return seen.size === structure.nodes.length;
}

/**
 * Placement invariants: no two structures overlap and every structure keeps the
 * required share of its influence inside the world. Returns the problems found,
 * empty when the placement is valid.
 */
export function validatePlacement(
  structures: readonly GeologicalStructure[],
  insideWorld: WorldSampler,
  minShare: number
): string[] {
  const problems: string[] = [];

  for (const [index, structure] of structures.entries()) {
    const share = insideWorldShare(structure, insideWorld);
    if (share < minShare) {
      problems.push(
        `Structure "${structure.id}" keeps only ${share.toFixed(3)} of its influence inside the world.`
      );
    }
    for (const other of structures.slice(index + 1)) {
      const distance = structureDistance(structure, other);
      if (distance < 0) {
        problems.push(
          `Structures "${structure.id}" and "${other.id}" overlap by ${(-distance).toFixed(4)}.`
        );
      }
    }
  }
  return problems;
}
