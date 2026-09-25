import {
  edgePolyline,
  extraRibIndexes,
  nodeDegrees,
  nodeTangents,
  paintLandmassLayout,
  pointTangents,
  projectPoint,
  sideRail,
  structureChains,
  structureGeometry,
} from './landmass-layout-painter';
import type { LandmassEdge, LandmassLayout, LandmassNode } from '../../map-generator/types';
import type { MapProjection } from '../view/view-transform';

const projection: MapProjection = {
  cellSize: 10,
  left: 0,
  top: 0,
  width: 100,
  height: 100,
};

const layout: LandmassLayout = {
  structures: [
    {
      id: 'landmass-1',
      archetype: 'elongated',
      nodes: [
        { id: 'n1', position: { x: 0.4, y: 0.5 }, radius: 0.05 },
        { id: 'n2', position: { x: 0.6, y: 0.5 }, radius: 0.03 },
      ],
      edges: [{ id: 'e1', from: 'n1', to: 'n2' }],
      shelfId: 'shelf-1',
    },
  ],
  shelves: [{ id: 'shelf-1', width: 0.07, targetDepth: 0.35, falloff: 0.5, irregularity: 0.35 }],
};

function node(id: string, x: number, y: number, radius = 0.05): LandmassNode {
  return { id, position: { x, y }, radius };
}

function edge(id: string, from: string, to: string): LandmassEdge {
  return { id, from, to };
}

/** Drops the tiny float error of the trigonometric normal. */
function rounded(points: readonly { x: number; y: number }[]) {
  const round = (value: number): number => Math.round(value * 1e6) / 1e6;
  return points.map(point => ({ x: round(point.x), y: round(point.y) }));
}

function recorder(): { calls: string[]; context: CanvasRenderingContext2D } {
  const calls: string[] = [];
  const record = (name: string) => (): void => {
    calls.push(name);
  };
  const context = {
    save: record('save'),
    restore: record('restore'),
    beginPath: record('beginPath'),
    closePath: record('closePath'),
    moveTo: record('moveTo'),
    lineTo: record('lineTo'),
    bezierCurveTo: record('bezierCurveTo'),
    arc: record('arc'),
    ellipse: record('ellipse'),
    rect: record('rect'),
    clip: record('clip'),
    fill: (...args: unknown[]) => {
      calls.push(args[0] === 'evenodd' ? 'fill-evenodd' : 'fill');
    },
    stroke: record('stroke'),
  } as unknown as CanvasRenderingContext2D;
  return { calls, context };
}

/** A corridor run whose axis points sit on a straight line, one unit apart. */
function runWith(pointCount: number, nodeIndexes: readonly number[], closed: boolean) {
  const points = Array.from({ length: pointCount }, (_, index) => ({ x: index, y: 0 }));
  return {
    points,
    radii: points.map(() => ({ x: 1, y: 1 })),
    left: points.map(point => ({ x: point.x, y: -1 })),
    right: points.map(point => ({ x: point.x, y: 1 })),
    closed,
    nodeIndexes,
  };
}

describe('landmass layout painter geometry', () => {
  it('puts normalized cell centres exactly on the raster', () => {
    expect(projectPoint(projection, { width: 11, height: 11 }, { x: 0, y: 0 })).toEqual({
      x: 5,
      y: 5,
    });
    expect(projectPoint(projection, { width: 11, height: 11 }, { x: 0.5, y: 0.5 })).toEqual({
      x: 55,
      y: 55,
    });
    expect(projectPoint(projection, { width: 11, height: 11 }, { x: 1, y: 1 })).toEqual({
      x: 105,
      y: 105,
    });
  });

  it('follows an edge through its control points', () => {
    const withControl = { ...edge('e1', 'a', 'b'), controlPoints: [{ x: 0.5, y: 0.3 }] };

    expect(edgePolyline(withControl, node('a', 0.4, 0.5), node('b', 0.6, 0.5))).toEqual([
      { x: 0.4, y: 0.5 },
      { x: 0.5, y: 0.3 },
      { x: 0.6, y: 0.5 },
    ]);
  });

  it('reads the direction of the polyline at every point', () => {
    expect(
      pointTangents([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ])
    ).toEqual([0, 0]);
    expect(
      pointTangents([
        { x: 0, y: 0 },
        { x: 0, y: 10 },
      ])
    ).toEqual([Math.PI / 2, Math.PI / 2]);
    expect(
      pointTangents([
        { x: 0, y: 0 },
        { x: 10, y: 10 },
        { x: 20, y: 0 },
      ])
    ).toEqual([Math.PI / 4, 0, -Math.PI / 4]);
  });

  it('places width points on both sides of the polyline', () => {
    const points = [
      { x: 0, y: 50 },
      { x: 100, y: 50 },
    ];
    const radii = [
      { x: 10, y: 10 },
      { x: 20, y: 20 },
    ];

    expect(rounded(sideRail(points, radii, -1))).toEqual([
      { x: 0, y: 40 },
      { x: 100, y: 30 },
    ]);
    expect(rounded(sideRail(points, radii, 1))).toEqual([
      { x: 0, y: 60 },
      { x: 100, y: 70 },
    ]);
  });

  it('places an anisotropic width point on the ellipse boundary', () => {
    const [rail] = sideRail(
      [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ],
      [
        { x: 20, y: 10 },
        { x: 20, y: 10 },
      ],
      -1
    );
    const ellipseDistance = (rail.x / 20) ** 2 + (rail.y / 10) ** 2;

    expect(ellipseDistance).toBeCloseTo(1, 10);
  });

  it('counts the edges touching every node', () => {
    const structure = {
      edges: [edge('e1', 'a', 'b'), edge('e2', 'b', 'c'), edge('e3', 'b', 'd')],
    };

    expect([...nodeDegrees(structure)]).toEqual([
      ['a', 1],
      ['b', 3],
      ['c', 1],
      ['d', 1],
    ]);
  });

  it('keeps the edge line orientation at both of its ends', () => {
    const structure = {
      nodes: [node('a', 0.4, 0.5), node('b', 0.6, 0.5)],
      edges: [edge('e1', 'a', 'b')],
    };
    const tangents = nodeTangents(structure);

    // A line orientation, so travelling left and right gives the same value.
    expect(tangents.get('a')).toBeCloseTo(0);
    expect(tangents.get('b')).toBeCloseTo(0);
  });

  it('keeps one corridor direction through a bend', () => {
    const structure = {
      nodes: [node('a', 0, 0.5), node('b', 0.5, 0.5), node('c', 0.6, 0.6)],
      edges: [edge('e1', 'a', 'b'), edge('e2', 'b', 'c')],
    };

    expect(nodeTangents(structure).get('b')).toBeCloseTo(Math.PI / 8);
  });

  it('gives a branch one unambiguous bar direction', () => {
    const structure = {
      nodes: [node('a', 0, 0.5), node('b', 0.5, 0.5), node('c', 1, 0.5), node('d', 0.5, 0.8)],
      edges: [edge('e1', 'a', 'b'), edge('e2', 'b', 'c'), edge('e3', 'b', 'd')],
    };

    expect(nodeTangents(structure).get('b')).toBeCloseTo(0);
  });

  it('merges a chain of edges into one axis and one corridor', () => {
    const structure = {
      id: 'chain',
      archetype: 'elongated' as const,
      nodes: [node('a', 0.2, 0.5), node('b', 0.5, 0.5, 0.02), node('c', 0.8, 0.5, 0.02)],
      edges: [edge('e1', 'a', 'b'), edge('e2', 'b', 'c')],
      shelfId: 'shelf-1',
    };
    const geometry = structureGeometry(structure, projection, { width: 11, height: 11 });

    expect(geometry.chains).toHaveLength(1);
    expect(geometry.chains[0].points).toHaveLength(3);
    expect(geometry.chains[0].runs).toHaveLength(1);
    expect(geometry.chains[0].runs[0].left).toHaveLength(3);
    expect(geometry.nodes).toHaveLength(3);
    expect(geometry.nodes.map(entry => entry.branch)).toEqual([false, false, false]);
  });

  it('keeps one continuous corridor at the authored width through a tight arc', () => {
    const wide = {
      id: 'arc',
      archetype: 'elongated' as const,
      nodes: [node('a', 0.2, 0.5, 0.2), node('b', 0.5, 0.5, 0.2), node('c', 0.5, 0.8, 0.2)],
      edges: [edge('e1', 'a', 'b'), edge('e2', 'b', 'c')],
      shelfId: 'shelf-1',
    };
    const tight = structureGeometry(wide, projection, { width: 11, height: 11 });

    expect(tight.chains[0].points).toHaveLength(3);
    expect(tight.chains[0].runs).toHaveLength(1);
    const middle = tight.chains[0].points[1];
    const innerRail = tight.chains[0].runs[0].left[1];
    expect(Math.hypot(innerRail.x - middle.x, innerRail.y - middle.y)).toBeCloseTo(20, 5);
  });

  it('keeps a continuous helper ribbon when a folded axis crosses itself', () => {
    const folded = {
      id: 'folded',
      archetype: 'elongated' as const,
      nodes: [
        node('a', 0.2, 0.2, 0.03),
        node('b', 0.8, 0.8, 0.03),
        node('c', 0.2, 0.8, 0.03),
        node('d', 0.8, 0.2, 0.03),
      ],
      edges: [edge('e1', 'a', 'b'), edge('e2', 'b', 'c'), edge('e3', 'c', 'd')],
      shelfId: 'shelf-1',
    };

    expect(
      structureGeometry(folded, projection, { width: 11, height: 11 }).chains[0].runs
    ).toHaveLength(1);
  });

  it('closes a ring into one chain and repeats its first point', () => {
    const structure = {
      id: 'ring',
      archetype: 'lagoon' as const,
      nodes: [
        node('a', 0.3, 0.3, 0.02),
        node('b', 0.7, 0.3, 0.02),
        node('c', 0.7, 0.7, 0.02),
        node('d', 0.3, 0.7, 0.02),
      ],
      edges: [
        edge('e1', 'a', 'b'),
        edge('e2', 'b', 'c'),
        edge('e3', 'c', 'd'),
        edge('e4', 'd', 'a'),
      ],
      shelfId: 'shelf-1',
    };
    const chains = structureChains(structure);

    expect(chains).toEqual([{ path: ['a', 'b', 'c', 'd', 'a'], closed: true }]);

    const geometry = structureGeometry(structure, projection, { width: 11, height: 11 });
    expect(geometry.chains[0].points).toHaveLength(5);
    expect(geometry.chains[0].points[4]).toEqual(geometry.chains[0].points[0]);
    expect(geometry.chains[0].runs).toHaveLength(1);
    expect(geometry.chains[0].runs[0].left.at(-1)).toEqual(geometry.chains[0].runs[0].left[0]);
    expect(geometry.chains[0].runs[0].right.at(-1)).toEqual(geometry.chains[0].runs[0].right[0]);
  });

  it('starts one chain per branch arm and one per open end', () => {
    const structure = {
      nodes: [node('a', 0.2, 0.5), node('b', 0.5, 0.5), node('c', 0.8, 0.5), node('d', 0.5, 0.8)],
      edges: [edge('e1', 'a', 'b'), edge('e2', 'b', 'c'), edge('e3', 'b', 'd')],
    };

    expect(structureChains(structure).map(chain => chain.path)).toEqual([
      ['a', 'b'],
      ['b', 'c'],
      ['b', 'd'],
    ]);
  });

  it('clips the scene to the world before drawing anything', () => {
    const { calls, context } = recorder();

    paintLandmassLayout(context, projection, {
      layout,
      size: { width: 11, height: 11 },
      shape: 'disc',
    });

    expect(calls.slice(0, 4)).toEqual(['save', 'beginPath', 'ellipse', 'clip']);
    expect(calls.at(-1)).toBe('restore');
    expect(calls.indexOf('clip')).toBeLessThan(calls.indexOf('fill'));
    expect(calls.indexOf('clip')).toBeLessThan(calls.indexOf('arc'));
  });

  it('colours the body from the rail curve instead of capsules', () => {
    const { calls, context } = recorder();
    const bent: LandmassLayout = {
      ...layout,
      structures: [
        {
          ...layout.structures[0],
          edges: [
            {
              id: 'e1',
              from: 'n1',
              to: 'n2',
              controlPoints: [{ x: 0.5, y: 0.35 }],
            },
          ],
        },
      ],
    };

    paintLandmassLayout(context, projection, { layout: bent, size: { width: 11, height: 11 } });

    expect(calls).toContain('bezierCurveTo');
    expect(calls).toContain('fill');
    expect(calls).toContain('ellipse');
  });

  it('fills a ring with even-odd rails so the seam stays part of the body', () => {
    const { calls, context } = recorder();
    const ring: LandmassLayout = {
      structures: [
        {
          id: 'ring',
          archetype: 'lagoon',
          nodes: [
            node('a', 0.3, 0.3, 0.04),
            node('b', 0.7, 0.3, 0.04),
            node('c', 0.7, 0.7, 0.04),
            node('d', 0.3, 0.7, 0.04),
          ],
          edges: [
            edge('e1', 'a', 'b'),
            edge('e2', 'b', 'c'),
            edge('e3', 'c', 'd'),
            edge('e4', 'd', 'a'),
          ],
          shelfId: 'shelf-1',
        },
      ],
      shelves: layout.shelves,
    };

    paintLandmassLayout(context, projection, { layout: ring, size: { width: 11, height: 11 } });

    expect(calls).toContain('fill-evenodd');
    expect(calls).toContain('bezierCurveTo');
  });

  it('fills the disc of a structure without edges', () => {
    const { calls, context } = recorder();
    const single: LandmassLayout = {
      structures: [
        {
          id: 'landmass-1',
          archetype: 'round',
          nodes: [node('n1', 0.5, 0.5, 0.05)],
          edges: [],
          shelfId: 'shelf-1',
        },
      ],
      shelves: layout.shelves,
    };

    paintLandmassLayout(context, projection, { layout: single, size: { width: 11, height: 11 } });

    expect(calls).toContain('ellipse');
    expect(calls).toContain('fill');
    expect(calls).toContain('arc');
  });

  it('places one helper rib halfway between consecutive real nodes', () => {
    expect(extraRibIndexes(runWith(9, [0, 8], false))).toEqual([4]);
    expect(extraRibIndexes(runWith(3, [0, 2], false))).toEqual([1]);
    expect(extraRibIndexes(runWith(7, [0, 3, 6], true))).toEqual([2, 5]);
  });

  it('skips the clip without a world shape', () => {
    const { calls, context } = recorder();

    paintLandmassLayout(context, projection, { layout, size: { width: 11, height: 11 } });

    expect(calls).not.toContain('save');
    expect(calls).not.toContain('clip');
    expect(calls).not.toContain('restore');
  });
});
