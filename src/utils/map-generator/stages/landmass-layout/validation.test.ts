import { isLandmassLayout, validateLayout } from './validation';
import type { GeologicalStructure, LandmassLayout, LandmassNode } from '../../types';

const shelf = { id: 'shelf-1', width: 0.07, targetDepth: 0.35, falloff: 0.5, irregularity: 0.35 };

function node(id: string, x: number, y: number, radius = 0.05): LandmassNode {
  return { id, position: { x, y }, radius };
}

function layout(overrides: Partial<GeologicalStructure> = {}): LandmassLayout {
  return {
    shelves: [shelf],
    structures: [
      {
        id: 'landmass-1',
        archetype: 'elongated',
        nodes: [node('n1', 0.1, 0.1), node('n2', 0.2, 0.1)],
        edges: [{ id: 'e1', from: 'n1', to: 'n2' }],
        shelfId: 'shelf-1',
        ...overrides,
      },
    ],
  };
}

describe('validateLayout', () => {
  it('accepts a valid layout', () => {
    expect(() => validateLayout(layout())).not.toThrow();
  });

  it('rejects duplicate structure and shelf ids', () => {
    const base = layout();
    expect(() =>
      validateLayout({ ...base, structures: [base.structures[0], base.structures[0]] })
    ).toThrow('Duplicate structure id');
    expect(() => validateLayout({ ...base, shelves: [shelf, shelf] })).toThrow(
      'Duplicate shelf id'
    );
  });

  it('rejects dangling and self-referencing edges', () => {
    expect(() =>
      validateLayout(layout({ edges: [{ id: 'e1', from: 'n1', to: 'missing' }] }))
    ).toThrow('unknown node');
    expect(() => validateLayout(layout({ edges: [{ id: 'e1', from: 'n1', to: 'n1' }] }))).toThrow(
      'connects a node to itself'
    );
  });

  it('rejects invalid node data', () => {
    expect(() =>
      validateLayout(layout({ nodes: [node('n1', 0.1, 0.1), node('n1', 0.2, 0.1)] }))
    ).toThrow('Duplicate node id');
    expect(() =>
      validateLayout(layout({ nodes: [node('n1', 0.1, 0.1, 0), node('n2', 0.2, 0.1)] }))
    ).toThrow('non-positive radius');
    expect(() =>
      validateLayout(layout({ nodes: [node('n1', NaN, 0.1), node('n2', 0.2, 0.1)] }))
    ).toThrow('invalid coordinates');
    expect(() => validateLayout(layout({ nodes: [node('n1', 0.1, 0.1)] }))).toThrow(
      'at least two nodes'
    );
  });

  it('rejects non-finite radii and control points', () => {
    expect(() =>
      validateLayout(layout({ nodes: [node('n1', 0.1, 0.1, Infinity), node('n2', 0.2, 0.1)] }))
    ).toThrow('non-positive radius');
    expect(() =>
      validateLayout(
        layout({
          edges: [{ id: 'e1', from: 'n1', to: 'n2', controlPoints: [{ x: NaN, y: 0.1 }] }],
        })
      )
    ).toThrow('invalid control point');
  });

  it('narrows unknown data to a valid layout', () => {
    expect(isLandmassLayout(layout())).toBe(true);
    expect(isLandmassLayout({ structures: [], shelves: [] })).toBe(true);
    expect(isLandmassLayout({ structures: 'nope', shelves: [] })).toBe(false);
    expect(isLandmassLayout(undefined)).toBe(false);
    expect(
      isLandmassLayout(layout({ nodes: [node('n1', 0.1, 0.1, Infinity), node('n2', 0.2, 0.1)] }))
    ).toBe(false);
  });

  it('rejects disconnected structures and unknown shelves', () => {
    expect(() =>
      validateLayout(
        layout({
          nodes: [node('n1', 0.1, 0.1), node('n2', 0.2, 0.1), node('n3', 0.3, 0.1)],
        })
      )
    ).toThrow('not connected');
    expect(() => validateLayout(layout({ shelfId: 'missing' }))).toThrow('Unknown shelf');
  });
});
