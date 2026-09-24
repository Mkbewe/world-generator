import { STRUCTURE_GAP } from '../defaults';
import {
  type Bounds,
  segmentDistance,
  structureBounds,
  type StructureSegment,
  structureSegments,
} from '../influence';
import type { PlaceableStructure, StructureDraft } from '../shape/draft';

/** Cell size of the placement index, roughly one structure footprint. */
const INDEX_CELL_SIZE = 0.15;

/** A placed structure with the data placement needs for collision checks. */
export interface PlacedEntry {
  readonly structure: StructureDraft;
  readonly bounds: Bounds;
  readonly segments: readonly StructureSegment[];
}

/** Precomputes the collision data of a placed structure. */
export function entryOf(
  structure: StructureDraft,
  bounds: Bounds = structureBounds(structure),
  segments: readonly StructureSegment[] = structureSegments(structure)
): PlacedEntry {
  return { structure, bounds, segments };
}

/** Uniform grid over the world, so collision checks only see nearby structures. */
export class StructureIndex {
  private readonly cells = new Map<string, number[]>();

  constructor(private readonly cellSize = INDEX_CELL_SIZE) {}

  insert(index: number, bounds: Bounds): void {
    for (const key of cellKeys(bounds, this.cellSize)) {
      const cell = this.cells.get(key);
      if (cell) {
        cell.push(index);
      } else {
        this.cells.set(key, [index]);
      }
    }
  }

  query(bounds: Bounds): number[] {
    const found = new Set<number>();
    for (const key of cellKeys(bounds, this.cellSize)) {
      for (const index of this.cells.get(key) ?? []) {
        found.add(index);
      }
    }
    return [...found];
  }
}

function cellKeys(bounds: Bounds, cellSize: number): string[] {
  const keys: string[] = [];
  const minX = Math.floor(bounds.minX / cellSize);
  const maxX = Math.floor(bounds.maxX / cellSize);
  const minY = Math.floor(bounds.minY / cellSize);
  const maxY = Math.floor(bounds.maxY / cellSize);

  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      keys.push(`${x}:${y}`);
    }
  }
  return keys;
}

/** Smallest gap between two influence regions; negative means overlap. */
export function structureDistance(
  left: PlaceableStructure,
  right: PlaceableStructure,
  leftSegments: readonly StructureSegment[] = structureSegments(left),
  rightSegments: readonly StructureSegment[] = structureSegments(right)
): number {
  return segmentsDistance(leftSegments, rightSegments);
}

/** Smallest gap between two precomputed influence segment lists. */
export function segmentsDistance(
  leftSegments: readonly StructureSegment[],
  rightSegments: readonly StructureSegment[]
): number {
  let nearest = Infinity;

  for (const first of leftSegments) {
    for (const second of rightSegments) {
      const closest = segmentDistance(first, second);
      const firstRadius = first.fromRadius + (first.toRadius - first.fromRadius) * closest.leftAt;
      const secondRadius =
        second.fromRadius + (second.toRadius - second.fromRadius) * closest.rightAt;
      nearest = Math.min(nearest, closest.distance - firstRadius - secondRadius);
    }
  }
  return nearest;
}

/**
 * Smallest gap between the candidate's influence and the nearby placed ones;
 * Infinity when nothing is close enough to matter. The index is queried with
 * the bounds widened by the required gap, so a structure just across a cell
 * border still counts.
 */
export function clearanceFrom(
  structure: PlaceableStructure,
  placed: readonly PlacedEntry[],
  index: StructureIndex,
  segments: readonly StructureSegment[] = structureSegments(structure),
  bounds: Bounds = structureBounds(structure)
): number {
  const query = {
    minX: bounds.minX - STRUCTURE_GAP,
    maxX: bounds.maxX + STRUCTURE_GAP,
    minY: bounds.minY - STRUCTURE_GAP,
    maxY: bounds.maxY + STRUCTURE_GAP,
  };
  let clearance = Infinity;

  for (const neighbour of index.query(query)) {
    const other = placed[neighbour];
    if (other) {
      clearance = Math.min(clearance, segmentsDistance(segments, other.segments));
      if (clearance < 0) {
        // Overlaps are final: no need to measure the remaining neighbours.
        return clearance;
      }
    }
  }
  return clearance;
}
