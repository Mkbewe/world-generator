import { containsZone, structureCentre } from './zone-geometry';
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

describe('containsZone', () => {
  it('covers the whole structure', () => {
    expect(containsZone(STRUCTURE, { kind: 'whole' }, { x: 0, y: 0 })).toBe(true);
  });

  it('splits a half around the structure centre', () => {
    const low: ZoneGeometry = { kind: 'half', axis: 'x', side: 'low' };
    const high: ZoneGeometry = { kind: 'half', axis: 'x', side: 'high' };

    expect(containsZone(STRUCTURE, low, { x: 0.4, y: 0.5 })).toBe(true);
    expect(containsZone(STRUCTURE, low, { x: 0.6, y: 0.5 })).toBe(false);
    expect(containsZone(STRUCTURE, high, { x: 0.6, y: 0.5 })).toBe(true);
  });

  it('covers a centre core by radius fraction', () => {
    const core: ZoneGeometry = { kind: 'center', radiusFraction: 0.3 };

    expect(containsZone(STRUCTURE, core, { x: 0.5, y: 0.5 })).toBe(true);
    expect(containsZone(STRUCTURE, core, { x: 0.9, y: 0.5 })).toBe(false);
  });

  it('covers an edge band outside the inner radius', () => {
    const band: ZoneGeometry = { kind: 'edge', widthFraction: 0.2 };

    expect(containsZone(STRUCTURE, band, { x: 0.5, y: 0.5 })).toBe(false);
    expect(containsZone(STRUCTURE, band, { x: 0.9, y: 0.5 })).toBe(true);
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

  it('falls back to the world middle for an empty structure', () => {
    expect(structureCentre({ ...STRUCTURE, nodes: [] })).toEqual({ x: 0.5, y: 0.5 });
  });
});
