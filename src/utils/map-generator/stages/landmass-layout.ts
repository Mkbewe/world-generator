import {
  BASE_LANDMASS_WIDTH,
  LANDMASS_GROUP_DISTANCE,
  LANDMASS_MARGIN,
  MAX_SPINE_POINTS,
  MIN_SPINE_POINTS,
  SPINE_TAPER,
} from './landmass-defaults';
import { containsWorld, type WorldShape } from '../../world-shape';
import type { SeededRandom } from '../random/seeded-random';
import type { LandmassConfig, LandShape, ShelfDefinition, WorldPoint } from '../types';

/** Structure geometry before the shelf grouping. */
export interface StructureSeed {
  readonly spine: readonly WorldPoint[];
  readonly widthProfile: readonly number[];
  readonly orientation: number;
  readonly irregularity: number;
  readonly positiveShapes: readonly LandShape[];
  readonly negativeShapes: readonly LandShape[];
}

/** Builds one structure from the configuration and the deterministic stream. */
export function createStructure(
  index: number,
  config: LandmassConfig,
  shape: WorldShape,
  random: SeededRandom
): StructureSeed {
  const spine = createSpine(config, shape, random);
  const base = BASE_LANDMASS_WIDTH * config.scale * (0.8 + random.next() * 0.4);
  const widthProfile = spine.map((_, point) => {
    const position = spine.length === 1 ? 0.5 : point / (spine.length - 1);
    return base * (SPINE_TAPER + (1 - SPINE_TAPER) * Math.sin(Math.PI * position));
  });
  const prefix = `landmass-${index + 1}`;
  const last = spine[spine.length - 1];

  return {
    spine,
    widthProfile,
    orientation: Math.atan2(last.y - spine[0].y, last.x - spine[0].x),
    irregularity: config.irregularity,
    positiveShapes: createShapes(`${prefix}-peninsula`, shape, spine, random, 1, 2),
    negativeShapes: createShapes(`${prefix}-bay`, shape, spine, random, 0, 2),
  };
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

/** Share of the world's land area the structures are expected to cover. */
export function estimateCoverage(structures: readonly StructureSeed[], worldArea: number): number {
  if (worldArea <= 0) {
    return 0;
  }

  const area = structures.reduce((sum, structure) => {
    const capsule = polylineLength(structure.spine) * mean(structure.widthProfile) * 2;
    const added = structure.positiveShapes.reduce((total, shape) => total + shapeArea(shape), 0);
    const cut = structure.negativeShapes.reduce((total, shape) => total + shapeArea(shape), 0);
    return sum + capsule + added - cut;
  }, 0);

  return Math.min(1, Math.max(0, area / worldArea));
}

function createSpine(
  config: LandmassConfig,
  shape: WorldShape,
  random: SeededRandom
): WorldPoint[] {
  let point = randomPointInside(shape, random);
  let direction = random.next() * Math.PI * 2;
  const segmentLength = (0.12 + random.next() * 0.12) * config.scale;
  const planned =
    MIN_SPINE_POINTS + Math.floor(random.next() * (MAX_SPINE_POINTS - MIN_SPINE_POINTS + 1));
  const points = [point];

  for (let index = 1; index < planned; index++) {
    direction += (random.next() - 0.5) * 0.8;
    const next = {
      x: point.x + Math.cos(direction) * segmentLength,
      y: point.y + Math.sin(direction) * segmentLength,
    };
    if (!insideWorld(shape, next)) {
      break;
    }
    points.push(next);
    point = next;
  }

  // Every spine needs two points; fall back towards the centre of the world.
  if (points.length < MIN_SPINE_POINTS) {
    points.push(towardsCenter(points[0], segmentLength / 2));
  }

  return points;
}

function createShapes(
  prefix: string,
  shape: WorldShape,
  spine: readonly WorldPoint[],
  random: SeededRandom,
  min: number,
  max: number
): LandShape[] {
  const shapes: LandShape[] = [];
  const count = min + Math.floor(random.next() * (max - min + 1));

  for (let index = 0; index < count; index++) {
    const anchor = spine[Math.floor(random.next() * spine.length)];
    const orientation = random.next() * Math.PI;
    const offset = 0.06 + random.next() * 0.05;
    const candidate = {
      x: anchor.x + Math.cos(orientation) * offset,
      y: anchor.y + Math.sin(orientation) * offset,
    };
    shapes.push({
      id: `${prefix}-${index + 1}`,
      center: insideWorld(shape, candidate) ? candidate : towardsCenter(anchor, offset),
      halfLength: 0.03 + random.next() * 0.04,
      halfWidth: 0.015 + random.next() * 0.02,
      orientation,
      irregularity: 0.2 + random.next() * 0.4,
    });
  }

  return shapes;
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
  const scale = 1 - 2 * LANDMASS_MARGIN;
  return containsWorld(shape, (2 * point.x - 1) / scale, (2 * point.y - 1) / scale);
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

function shapeArea(shape: LandShape): number {
  return Math.PI * shape.halfLength * shape.halfWidth;
}

function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}
