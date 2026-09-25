import type { PlaceableStructure } from './shape/draft';
import { mainChainNodes } from './influence';

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
