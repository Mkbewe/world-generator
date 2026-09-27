import { containsZone } from './zone-geometry';
import type { GeologicalStructure, ZoneGeometry } from '../../map-generator/types';

const STRUCTURE: GeologicalStructure = {
  id: 's',
  archetype: 'round',
  nodes: [
    { id: 's-n1', position: { x: 0.4, y: 0.5 }, radius: 0.05 },
    { id: 's-n2', position: { x: 0.6, y: 0.5 }, radius: 0.05 },
  ],
  edges: [{ id: 's-e1', from: 's-n1', to: 's-n2' }],
  shelfId: 'shelf-1',
};

const BRANCHED: GeologicalStructure = {
  ...STRUCTURE,
  mainNodeCount: 2,
  nodes: [...STRUCTURE.nodes, { id: 's-n3', position: { x: 0.5, y: 0.3 }, radius: 0.05 }],
  edges: [...STRUCTURE.edges, { id: 's-e2', from: 's-n1', to: 's-n3' }],
};

describe('containsZone', () => {
  it('covers the whole structure', () => {
    expect(containsZone(STRUCTURE, { kind: 'whole' }, { x: 0, y: 0 })).toBe(true);
  });

  it('covers a chain stretch as a length fraction', () => {
    const first: ZoneGeometry = { kind: 'chain', pathId: 'main', from: 0, to: 0.5 };

    expect(containsZone(STRUCTURE, first, { x: 0.4, y: 0.5 })).toBe(true);
    expect(containsZone(STRUCTURE, first, { x: 0.5, y: 0.5 })).toBe(true);
    expect(containsZone(STRUCTURE, first, { x: 0.6, y: 0.5 })).toBe(false);
  });

  it('covers the core band along the axis', () => {
    const spine: ZoneGeometry = { kind: 'spine', pathId: 'main', from: 0.25, to: 0.75, share: 0.5 };

    expect(containsZone(STRUCTURE, spine, { x: 0.5, y: 0.52 })).toBe(true);
    expect(containsZone(STRUCTURE, spine, { x: 0.5, y: 0.53 })).toBe(false);
    expect(containsZone(STRUCTURE, spine, { x: 0.42, y: 0.5 })).toBe(false);
  });

  it('covers the outer band of the corridor', () => {
    const rim: ZoneGeometry = { kind: 'rim', pathId: 'main', from: 0.25, to: 0.75, share: 0.5 };

    expect(containsZone(STRUCTURE, rim, { x: 0.5, y: 0.52 })).toBe(false);
    expect(containsZone(STRUCTURE, rim, { x: 0.5, y: 0.53 })).toBe(true);
    expect(containsZone(STRUCTURE, rim, { x: 0.9, y: 0.5 })).toBe(false);
    expect(containsZone(STRUCTURE, rim, { x: 0.42, y: 0.53 })).toBe(false);
  });

  it('covers a point influence', () => {
    const point: ZoneGeometry = {
      kind: 'point',
      center: { x: 0.5, y: 0.5 },
      influenceRadius: 0.1,
    };

    expect(containsZone(STRUCTURE, point, { x: 0.55, y: 0.5 })).toBe(true);
    expect(containsZone(STRUCTURE, point, { x: 0.8, y: 0.5 })).toBe(false);
  });

  it('keeps a point zone inside the corridor', () => {
    const offshore: ZoneGeometry = {
      kind: 'point',
      center: { x: 0.5, y: 0.9 },
      influenceRadius: 0.2,
    };

    expect(containsZone(STRUCTURE, offshore, { x: 0.5, y: 0.9 })).toBe(false);
  });

  it('limits a branch band to its own path and a local interval', () => {
    const branch: ZoneGeometry = {
      kind: 'rim',
      pathId: 'branch:s-e2',
      from: 0.2,
      to: 0.7,
      share: 0.5,
    };
    expect(containsZone(BRANCHED, branch, { x: 0.41, y: 0.4 })).toBe(true);
    expect(containsZone(BRANCHED, branch, { x: 0.55, y: 0.5 })).toBe(false);
    expect(containsZone(BRANCHED, branch, { x: 0.5, y: 0.3 })).toBe(false);
  });
});
