import { boundsCentre, boundsOf, offsetPoint } from './geometry';
import { containsWorld, type WorldShape } from '../../../world-shape';
import type { SeededRandom } from '../../random/seeded-random';
import type { LandmassEdge, LandmassNode, WorldPoint } from '../../types';

/** Geometry placement can move; the rest of a structure passes through. */
interface PlaceableStructure {
  readonly nodes: readonly LandmassNode[];
  readonly edges: readonly LandmassEdge[];
}

/**
 * Minimal placement for the model stage: every structure is centred on its own
 * anchor from a jittered grid inside the world. Collisions, rotations, shrinking
 * and intentional groups arrive with the placement stage of the refactor.
 */
export function placeStructures<T extends PlaceableStructure>(
  structures: readonly T[],
  shape: WorldShape,
  random: SeededRandom
): readonly T[] {
  const anchors = anchorPoints(shape, structures.length, random);
  return structures.map((structure, index) =>
    translateStructure(structure, offsetTo(anchors[index % anchors.length], structure))
  );
}

/** Offset that moves a structure's centre onto the anchor. */
function offsetTo(anchor: WorldPoint, structure: PlaceableStructure): WorldPoint {
  const centre = boundsCentre(boundsOf(structure.nodes.map(node => node.position)));
  return { x: anchor.x - centre.x, y: anchor.y - centre.y };
}

function translateStructure<T extends PlaceableStructure>(structure: T, offset: WorldPoint): T {
  return {
    ...structure,
    nodes: structure.nodes.map(node => ({
      ...node,
      position: offsetPoint(node.position, offset),
    })),
    edges: structure.edges.map(edge =>
      edge.controlPoints
        ? {
            ...edge,
            controlPoints: edge.controlPoints.map(point => offsetPoint(point, offset)),
          }
        : edge
    ),
  };
}

/** Jittered grid anchors inside the world shape, shuffled deterministically. */
function anchorPoints(shape: WorldShape, count: number, random: SeededRandom): WorldPoint[] {
  const columns = Math.max(2, Math.ceil(Math.sqrt(count)));
  const cell = 1 / columns;
  const anchors: WorldPoint[] = [];

  for (let row = 0; row < columns; row++) {
    for (let column = 0; column < columns; column++) {
      const point = {
        x: (column + 0.5 + (random.next() - 0.5) * 0.6) * cell,
        y: (row + 0.5 + (random.next() - 0.5) * 0.6) * cell,
      };
      if (containsWorld(shape, 2 * point.x - 1, 2 * point.y - 1)) {
        anchors.push(point);
      }
    }
  }

  for (let index = anchors.length - 1; index > 0; index--) {
    const swap = Math.floor(random.next() * (index + 1));
    [anchors[index], anchors[swap]] = [anchors[swap], anchors[index]];
  }
  return anchors.length > 0 ? anchors : [{ x: 0.5, y: 0.5 }];
}
