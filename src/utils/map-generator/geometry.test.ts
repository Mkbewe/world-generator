import {
  containsCoordinate,
  containsGeometry,
  distanceToCoordinate,
  distanceToGeometry,
  validateGeometry,
} from './geometry';

describe('geometry helpers', () => {
  const distance = (left: { x: number; y: number }, right: { x: number; y: number }) =>
    Math.hypot(left.x - right.x, left.y - right.y);

  it('checks ring and band containment and distances', () => {
    const ring = {
      kind: 'ring' as const,
      center: { x: 0, y: 0 },
      innerRadius: 2,
      outerRadius: 4,
    };
    const band = { kind: 'band' as const, axis: 'x' as const, center: 0.5, width: 0.2 };

    expect(containsGeometry(ring, { x: 3, y: 0 }, distance)).toBe(true);
    expect(distanceToGeometry(ring, { x: 5, y: 0 }, distance)).toBe(1);
    expect(containsGeometry(band, { x: 0.6, y: 0 }, distance)).toBe(true);
    expect(distanceToGeometry(band, { x: 0.8, y: 0 }, distance)).toBeCloseTo(0.2);
    expect(containsCoordinate(ring, 3)).toBe(true);
    expect(distanceToCoordinate(ring, 5)).toBe(1);
    expect(containsCoordinate(band, 0.6)).toBe(true);
    expect(distanceToCoordinate(band, 0.8)).toBeCloseTo(0.2);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects non-finite ring radii: %s',
    radius => {
      expect(() =>
        validateGeometry(
          'test',
          {
            kind: 'ring',
            center: { x: 0.5, y: 0.5 },
            innerRadius: 1,
            outerRadius: radius,
          },
          'Geometry'
        )
      ).toThrow(/valid radial range/);
    }
  );
});
