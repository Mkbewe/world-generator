import {
  createMarginSampler,
  createMaskSampler,
  createShapeSampler,
  edgeFrame,
  insideWorldShare,
} from './mask-sampler';
import type { WorldDimensions } from '../../../world-dimensions';
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

describe('createMarginSampler', () => {
  const dimensions: WorldDimensions = {
    widthMeters: 1000,
    heightMeters: 1000,
    sampleWidth: 10,
    sampleHeight: 10,
  };

  it('keeps the margin of ocean to the world edge', () => {
    const margin = createMarginSampler('disc', dimensions, 50);

    expect(margin({ x: 0.5, y: 0.5 })).toBe(true);
    // 100 m from the edge: inside the 50 m margin.
    expect(margin({ x: 0.9, y: 0.5 })).toBe(true);
    // 10 m from the edge: water, not island ground.
    expect(margin({ x: 0.99, y: 0.5 })).toBe(false);
    expect(margin({ x: 1.05, y: 0.5 })).toBe(false);
  });

  it('erodes the rectangle exactly per axis', () => {
    const margin = createMarginSampler(
      'rectangle',
      { widthMeters: 2000, heightMeters: 1000, sampleWidth: 20, sampleHeight: 10 },
      100
    );

    // 100 m is 0.05 of the width but 0.1 of the height.
    expect(margin({ x: 0.94, y: 0.5 })).toBe(true);
    expect(margin({ x: 0.96, y: 0.5 })).toBe(false);
    expect(margin({ x: 0.5, y: 0.89 })).toBe(true);
    expect(margin({ x: 0.5, y: 0.91 })).toBe(false);
  });

  it('caps the margin on worlds smaller than the margin itself', () => {
    const tiny: WorldDimensions = {
      widthMeters: 2,
      heightMeters: 2,
      sampleWidth: 2,
      sampleHeight: 2,
    };

    expect(createMarginSampler('disc', tiny, 5000)({ x: 0.5, y: 0.5 })).toBe(true);
  });

  it('matches the shape without a margin', () => {
    const shape = createShapeSampler('disc');
    const margin = createMarginSampler('disc', dimensions, 0);

    for (const point of [
      { x: 0.5, y: 0.5 },
      { x: 0.9, y: 0.5 },
      { x: 0.99, y: 0.5 },
    ]) {
      expect(margin(point)).toBe(shape(point));
    }
  });
});

describe('edgeFrame', () => {
  it('runs tangent to the disc edge with a signed gap', () => {
    const frame = edgeFrame('disc', { x: 0.75, y: 0.5 });

    expect(frame.gap).toBeCloseTo(0.25, 10);
    expect(frame.tangent).toBeCloseTo(Math.PI / 2, 10);
    expect(edgeFrame('disc', { x: 1.05, y: 0.5 }).gap).toBeLessThan(0);
  });

  it('follows the nearer rectangle edge', () => {
    const vertical = edgeFrame('rectangle', { x: 0.9, y: 0.5 });

    expect(vertical.gap).toBeCloseTo(0.1, 10);
    expect(vertical.tangent).toBeCloseTo(Math.PI / 2, 10);
    expect(edgeFrame('rectangle', { x: 0.5, y: 0.9 }).tangent).toBeCloseTo(0, 10);
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
