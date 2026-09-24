import { clearanceFrom, entryOf, structureDistance, StructureIndex } from './collision';
import type { GeologicalStructure } from '../../../types';
import { structureBounds } from '../influence';

/** A straight two-node structure of length 0.1 and radius 0.03. */
function structure(id: string, x: number, y: number): GeologicalStructure {
  return {
    id,
    archetype: 'elongated',
    nodes: [
      { id: `${id}-n1`, position: { x: x - 0.05, y }, radius: 0.03 },
      { id: `${id}-n2`, position: { x: x + 0.05, y }, radius: 0.03 },
    ],
    edges: [{ id: `${id}-e1`, from: `${id}-n1`, to: `${id}-n2` }],
    shelfId: 'shelf-1',
  };
}

describe('structureDistance', () => {
  it('measures the gap between influence regions', () => {
    // The facing ends are 0.3 apart; both radii shrink the gap to 0.24.
    expect(structureDistance(structure('a', 0.2, 0.5), structure('b', 0.6, 0.5))).toBeCloseTo(
      0.24,
      10
    );
  });

  it('goes negative when the influence regions overlap', () => {
    expect(structureDistance(structure('a', 0.5, 0.5), structure('b', 0.55, 0.5))).toBeLessThan(0);
  });
});

describe('StructureIndex', () => {
  it('reports only the structures whose bounds overlap the query', () => {
    const index = new StructureIndex(0.2);
    index.insert(0, structureBounds(structure('a', 0.2, 0.5)));
    index.insert(1, structureBounds(structure('b', 0.8, 0.5)));

    expect(index.query({ minX: 0.1, maxX: 0.3, minY: 0.4, maxY: 0.6 })).toEqual([0]);
    expect(index.query({ minX: 0.7, maxX: 0.9, minY: 0.4, maxY: 0.6 })).toEqual([1]);
    expect(index.query({ minX: 0.45, maxX: 0.55, minY: 0.45, maxY: 0.55 })).toEqual([]);
  });

  it('measures the clearance through the index', () => {
    const placed = structure('a', 0.2, 0.5);
    const index = new StructureIndex();
    index.insert(0, structureBounds(placed));

    // Close enough that the bounds overlap the query cell; the regions keep 0.01.
    expect(clearanceFrom(structure('b', 0.37, 0.5), [entryOf(placed)], index)).toBeCloseTo(
      0.01,
      10
    );
    // Far away, the index reports nothing to collide with.
    expect(clearanceFrom(structure('c', 0.9, 0.5), [entryOf(placed)], index)).toBe(Infinity);
  });
});
