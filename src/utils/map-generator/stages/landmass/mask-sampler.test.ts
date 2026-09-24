import { createMaskSampler, createShapeSampler, insideWorldShare } from './mask-sampler';
import type { GeologicalStructure } from '../../types';

const inside = createShapeSampler('disc');

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

describe('createMaskSampler', () => {
  const full = createMaskSampler(new Uint8Array(4 * 4).fill(1), 4, 4);

  it('reads cells of the mask for points on the map', () => {
    expect(full({ x: 0.5, y: 0.5 })).toBe(true);
    expect(full({ x: 0, y: 0 })).toBe(true);
    expect(full({ x: 1, y: 1 })).toBe(true);
  });

  it('treats points outside the map as outside the world', () => {
    expect(full({ x: 4, y: 0.5 })).toBe(false);
    expect(full({ x: -0.2, y: 0.5 })).toBe(false);
    expect(full({ x: 0.5, y: 2 })).toBe(false);
  });

  it('reports empty mask cells as outside', () => {
    const mask = new Uint8Array([1, 0, 0, 1]);
    const sampler = createMaskSampler(mask, 2, 2);

    expect(sampler({ x: 0, y: 0 })).toBe(true);
    expect(sampler({ x: 1, y: 0 })).toBe(false);
    expect(sampler({ x: 0, y: 1 })).toBe(false);
    expect(sampler({ x: 1, y: 1 })).toBe(true);
  });
});

describe('createShapeSampler', () => {
  it('matches the analytic world shape', () => {
    const disc = createShapeSampler('disc');

    expect(disc({ x: 0.5, y: 0.5 })).toBe(true);
    expect(disc({ x: 1.05, y: 0.5 })).toBe(false);
    expect(createShapeSampler('rectangle')({ x: 0.99, y: 0.5 })).toBe(true);
    expect(createShapeSampler('rectangle')({ x: 1.05, y: 0.5 })).toBe(false);
  });
});

describe('insideWorldShare', () => {
  it('keeps a centred structure fully inside and reports overhang at the edge', () => {
    expect(insideWorldShare(structure('a', 0.5, 0.5), inside)).toBe(1);
    expect(insideWorldShare(structure('b', 1.03, 0.5), inside)).toBeLessThan(0.5);
  });

  it('measures the whole corridor, control points included', () => {
    // Both nodes sit well inside the world, but the edge bends far outside.
    const bent: GeologicalStructure = {
      id: 'bent',
      archetype: 'winding',
      nodes: [
        { id: 'bent-n1', position: { x: 0.2, y: 0.5 }, radius: 0.02 },
        { id: 'bent-n2', position: { x: 0.8, y: 0.5 }, radius: 0.02 },
      ],
      edges: [
        {
          id: 'bent-e1',
          from: 'bent-n1',
          to: 'bent-n2',
          controlPoints: [{ x: 0.5, y: 1.6 }],
        },
      ],
      shelfId: 'shelf-1',
    };

    expect(insideWorldShare(bent, inside)).toBeLessThan(0.5);
  });
});
