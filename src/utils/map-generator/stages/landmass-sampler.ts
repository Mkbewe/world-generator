import type { LandmassDefinition, LandShape, WorldPoint } from '../types';

/** Continuous landmass classification: 1-based structure index, 0 outside every structure. */
export type LandmassSampler = (x: number, y: number) => number;

/** Geometry the sampler needs from a structure, without its identity. */
export type LandmassOutline = Pick<
  LandmassDefinition,
  'spine' | 'widthProfile' | 'positiveShapes' | 'negativeShapes'
>;

interface Segment {
  readonly from: WorldPoint;
  readonly alongX: number;
  readonly alongY: number;
  readonly lengthSquared: number;
  readonly widthFrom: number;
  readonly widthTo: number;
}

interface ShapeOutline {
  readonly shape: LandShape;
  readonly cos: number;
  readonly sin: number;
}

interface StructureOutline {
  readonly segments: readonly Segment[];
  readonly positive: readonly ShapeOutline[];
  readonly negative: readonly ShapeOutline[];
}

/**
 * Classification shared by the id map and the later heightmap: a point belongs
 * to the structure whose outline it is closest to. The outline counts the spine
 * capsule, the positive shapes and its own negative cuts; every outline value
 * is normalized, so 1 is exactly the border and larger values lie outside.
 * Outlines stay exact geometry here; coastline roughness belongs to later
 * stages.
 */
export function createLandmassSampler(landmasses: readonly LandmassOutline[]): LandmassSampler {
  const outlines = landmasses.map(prepareOutline);

  return (x, y) => {
    let owner = 0;
    let closest = Infinity;
    for (let index = 0; index < outlines.length; index++) {
      const score = structureScore(outlines[index], x, y);
      if (score < closest) {
        closest = score;
        owner = index + 1;
      }
    }
    return closest <= 1 ? owner : 0;
  };
}

function prepareOutline(landmass: LandmassOutline): StructureOutline {
  const segments: Segment[] = [];
  for (let index = 1; index < landmass.spine.length; index++) {
    const from = landmass.spine[index - 1];
    const to = landmass.spine[index];
    const alongX = to.x - from.x;
    const alongY = to.y - from.y;
    segments.push({
      from,
      alongX,
      alongY,
      lengthSquared: alongX * alongX + alongY * alongY,
      widthFrom: landmass.widthProfile[index - 1],
      widthTo: landmass.widthProfile[index],
    });
  }

  return {
    segments,
    positive: landmass.positiveShapes.map(prepareShape),
    negative: landmass.negativeShapes.map(prepareShape),
  };
}

function prepareShape(shape: LandShape): ShapeOutline {
  return {
    shape,
    cos: Math.cos(shape.orientation),
    sin: Math.sin(shape.orientation),
  };
}

function structureScore(outline: StructureOutline, x: number, y: number): number {
  if (outline.negative.some(shape => shapeScore(shape, x, y) <= 1)) {
    return Infinity;
  }

  let score = capsuleScore(outline, x, y);
  for (const shape of outline.positive) {
    score = Math.min(score, shapeScore(shape, x, y));
  }
  return score;
}

function capsuleScore(outline: StructureOutline, x: number, y: number): number {
  const { segments } = outline;
  let bestScore = Infinity;

  for (let index = 0; index < segments.length; index++) {
    const segment = segments[index];
    const progress =
      segment.lengthSquared === 0
        ? 0
        : clamp01(
            ((x - segment.from.x) * segment.alongX + (y - segment.from.y) * segment.alongY) /
              segment.lengthSquared
          );
    const distance = Math.hypot(
      x - (segment.from.x + segment.alongX * progress),
      y - (segment.from.y + segment.alongY * progress)
    );
    const width = segment.widthFrom + (segment.widthTo - segment.widthFrom) * progress;
    if (width > 0) {
      bestScore = Math.min(bestScore, distance / width);
    }
  }

  return bestScore;
}

function shapeScore(outline: ShapeOutline, x: number, y: number): number {
  const { shape, cos, sin } = outline;
  const deltaX = x - shape.center.x;
  const deltaY = y - shape.center.y;
  const along = (deltaX * cos + deltaY * sin) / shape.halfLength;
  const across = (-deltaX * sin + deltaY * cos) / shape.halfWidth;
  return Math.hypot(along, across);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
