import {
  type Bounds,
  type PlaceableStructure,
  segmentDistance,
  structureBounds,
  type StructureSegment,
  structureSegments,
} from './geometry';
import type { StructureDraft } from './types';
import { planarDistance } from '../../space';
import type { GeologicalStructure, WorldPoint } from '../../types';
import { STRUCTURE_GAP } from '../landmass-defaults';

/** Cell size of the placement index, roughly one structure footprint. */
const INDEX_CELL_SIZE = 0.15;

/** Longest sample step along an influence segment, in normalized units. */
const MAX_SAMPLE_STEP = 0.02;

/** Sample count limits per segment, so a long edge stays cheap. */
const MIN_SEGMENT_SAMPLES = 2;
const MAX_SEGMENT_SAMPLES = 16;

/** Tells whether a point lies inside the world the layout is placed in. */
export type WorldSampler = (point: WorldPoint) => boolean;

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

/**
 * Share of the influence corridor that lies inside the world. The samples cover
 * the whole geometry — every segment, its control points and both sides at the
 * local radius — so a curved edge cannot leave the world unnoticed.
 */
export function insideWorldShare(
  structure: PlaceableStructure,
  insideWorld: WorldSampler,
  bounds: Bounds = structureBounds(structure)
): number {
  // Fast path: a structure whose whole bounding box lies inside needs no samples.
  const corners = [
    { x: bounds.minX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.maxY },
    { x: bounds.minX, y: bounds.maxY },
    { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 },
  ];
  if (corners.every(corner => insideWorld(corner))) {
    return 1;
  }

  let samples = 0;
  let inside = 0;
  const record = (point: WorldPoint): void => {
    samples++;
    if (insideWorld(point)) {
      inside++;
    }
  };

  for (const segment of structureSegments(structure)) {
    const length = planarDistance(segment.from, segment.to);
    const radius = Math.max(Number.EPSILON, Math.min(segment.fromRadius, segment.toRadius));
    const step = Math.min(MAX_SAMPLE_STEP, radius / 2);
    const steps = Math.min(
      MAX_SEGMENT_SAMPLES,
      Math.max(MIN_SEGMENT_SAMPLES, Math.ceil(length / step))
    );
    const alongX = (segment.to.x - segment.from.x) / (length || 1);
    const alongY = (segment.to.y - segment.from.y) / (length || 1);

    for (let index = 0; index <= steps; index++) {
      const at = index / steps;
      const point = {
        x: segment.from.x + (segment.to.x - segment.from.x) * at,
        y: segment.from.y + (segment.to.y - segment.from.y) * at,
      };
      const localRadius = segment.fromRadius + (segment.toRadius - segment.fromRadius) * at;
      const normal = { x: -alongY * localRadius, y: alongX * localRadius };
      record(point);
      record({ x: point.x + normal.x, y: point.y + normal.y });
      record({ x: point.x - normal.x, y: point.y - normal.y });
    }
  }
  return samples === 0 ? 0 : inside / samples;
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
