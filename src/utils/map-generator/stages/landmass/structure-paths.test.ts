import { structurePaths } from './structure-paths';
import type { GeologicalStructure } from '../../types';

const BRANCHED: GeologicalStructure = {
  id: 's',
  archetype: 'branched',
  nodes: [
    { id: 'a', position: { x: 0.1, y: 0.5 }, radius: 0.05 },
    { id: 'b', position: { x: 0.5, y: 0.5 }, radius: 0.05 },
    { id: 'c', position: { x: 0.9, y: 0.5 }, radius: 0.05 },
    { id: 'd', position: { x: 0.5, y: 0.2 }, radius: 0.05 },
  ],
  edges: [
    { id: 'ab', from: 'a', to: 'b' },
    { id: 'bc', from: 'b', to: 'c' },
    { id: 'bd', from: 'b', to: 'd' },
  ],
  mainNodeCount: 3,
  shelfId: 'shelf-1',
};

describe('structurePaths', () => {
  it('separates the main corridor from a branch without connecting their tips', () => {
    const paths = structurePaths(BRANCHED);
    expect(paths.map(path => path.id)).toEqual(['main', 'branch:bd']);
    expect(paths[0].segments).toHaveLength(2);
    expect(paths[1].segments).toHaveLength(1);
    expect(paths[1].segments[0].from).toEqual({ x: 0.5, y: 0.5 });
  });

  it('keeps the main path stable when edge direction is reversed', () => {
    const reversed: GeologicalStructure = {
      ...BRANCHED,
      edges: [{ id: 'ab', from: 'b', to: 'a' }, ...BRANCHED.edges.slice(1)],
    };
    expect(structurePaths(reversed)[0].segments).toEqual(structurePaths(BRANCHED)[0].segments);
  });

  it('returns a zero-length main path for a single-node structure', () => {
    const single: GeologicalStructure = {
      ...BRANCHED,
      nodes: BRANCHED.nodes.slice(0, 1),
      edges: [],
      mainNodeCount: 1,
    };
    expect(structurePaths(single)).toEqual([
      { id: 'main', segments: [], length: 0, closed: false },
    ]);
  });

  it('keeps a closed lagoon on one main path', () => {
    const lagoon: GeologicalStructure = {
      ...BRANCHED,
      archetype: 'lagoon',
      nodes: BRANCHED.nodes.slice(0, 3),
      edges: [BRANCHED.edges[0], BRANCHED.edges[1], { id: 'ca', from: 'c', to: 'a' }],
      mainNodeCount: 3,
    };
    const paths = structurePaths(lagoon);
    expect(paths).toHaveLength(1);
    expect(paths[0].closed).toBe(true);
    expect(paths[0].segments).toHaveLength(3);
  });
});
