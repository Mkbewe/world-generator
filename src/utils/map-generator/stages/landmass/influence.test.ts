import type { PlaceableStructure } from './shape/draft';
import { mainChainNodes, nearestStructure, type StructureInfluence } from './influence';

function structure(mainNodeCount?: number): PlaceableStructure {
  return {
    nodes: [
      { id: 'land-1-n1', position: { x: 0.2, y: 0.5 }, radius: 0.05 },
      { id: 'land-1-n2', position: { x: 0.5, y: 0.5 }, radius: 0.05 },
      { id: 'land-1-b1n1', position: { x: 0.5, y: 0.7 }, radius: 0.03 },
    ],
    edges: [],
    mainNodeCount,
  };
}

describe('mainChainNodes', () => {
  it('keeps the main corridor and drops the branch arms', () => {
    expect(mainChainNodes(structure(2)).map(node => node.id)).toEqual(['land-1-n1', 'land-1-n2']);
  });

  it('falls back to every node when the count is unknown', () => {
    expect(mainChainNodes(structure())).toHaveLength(3);
  });
});

describe('nearestStructure', () => {
  it('follows the closest influence boundary when nearby arms have different radii', () => {
    const influence: StructureInfluence = {
      id: 'branched',
      bounds: { minX: 0, maxX: 1, minY: 0, maxY: 1 },
      segments: [
        {
          from: { x: 0.4, y: 0.5 },
          to: { x: 0.4, y: 0.5 },
          fromRadius: 0.03,
          toRadius: 0.03,
        },
        {
          from: { x: 0.6, y: 0.5 },
          to: { x: 0.6, y: 0.5 },
          fromRadius: 0.11,
          toRadius: 0.11,
        },
      ],
    };

    const left = nearestStructure([influence], { x: 0.499, y: 0.5 });
    const right = nearestStructure([influence], { x: 0.501, y: 0.5 });

    expect(left?.radius).toBe(0.11);
    expect(right?.radius).toBe(0.11);
    expect(
      left && right && Math.abs(left.distance - left.radius - (right.distance - right.radius))
    ).toBeLessThan(0.003);
  });
});
