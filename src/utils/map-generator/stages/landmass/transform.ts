import type { PlaceableStructure } from './shape/draft';
import type { WorldPoint } from '../../types';

/** Moves a point by the given offset. */
export function offsetPoint(point: WorldPoint, offset: WorldPoint): WorldPoint {
  return { x: point.x + offset.x, y: point.y + offset.y };
}

/** Rotates a structure around a centre, control points included. */
export function rotateStructure<T extends PlaceableStructure>(
  structure: T,
  angle: number,
  centre: WorldPoint
): T {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const rotate = (point: WorldPoint): WorldPoint => {
    const x = point.x - centre.x;
    const y = point.y - centre.y;
    return { x: centre.x + x * cos - y * sin, y: centre.y + x * sin + y * cos };
  };

  return mapStructure(structure, point => rotate(point), 1);
}

/** Scales a structure around a centre, radii and control points included. */
export function scaleStructure<T extends PlaceableStructure>(
  structure: T,
  factor: number,
  centre: WorldPoint
): T {
  return mapStructure(structure, point => point, factor, centre);
}

/** Moves a structure by an offset, control points included. */
export function translateStructure<T extends PlaceableStructure>(
  structure: T,
  offset: WorldPoint
): T {
  return mapStructure(structure, point => offsetPoint(point, offset), 1);
}

function mapStructure<T extends PlaceableStructure>(
  structure: T,
  move: (point: WorldPoint) => WorldPoint,
  factor: number,
  centre?: WorldPoint
): T {
  const scale = (point: WorldPoint): WorldPoint => {
    const scaled = centre
      ? {
          x: centre.x + (point.x - centre.x) * factor,
          y: centre.y + (point.y - centre.y) * factor,
        }
      : point;
    return move(scaled);
  };

  return {
    ...structure,
    nodes: structure.nodes.map(node => ({
      ...node,
      position: scale(node.position),
      radius: node.radius * factor,
    })),
    edges: structure.edges.map(edge =>
      edge.controlPoints ? { ...edge, controlPoints: edge.controlPoints.map(scale) } : edge
    ),
  };
}
