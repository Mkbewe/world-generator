import { gridDistanceTransform } from './grid-distance';

describe('gridDistanceTransform', () => {
  const owners = new Int16Array([0, 0, 0, 1, 1]);

  it('measures physical metres with the generator options', () => {
    const distances = gridDistanceTransform(owners, 5, 1, {
      borderDistance: 0,
      farDistance: Infinity,
      stepX: 10,
      stepY: 10,
      diagonal: Math.hypot(10, 10),
    });

    expect([...distances]).toEqual([20, 10, 0, 0, 10]);
  });

  it('measures raster cells with the preview options', () => {
    const distances = gridDistanceTransform(owners, 5, 1, {
      borderDistance: 0.5,
      farDistance: 6,
      stepX: 1,
      stepY: 1,
      diagonal: Math.SQRT2,
    });

    expect([...distances]).toEqual([2.5, 1.5, 0.5, 0.5, 1.5]);
  });

  it('keeps cells outside every region at zero', () => {
    const distances = gridDistanceTransform(new Int16Array([0, -1, 0]), 3, 1, {
      borderDistance: 0,
      farDistance: Infinity,
      stepX: 1,
      stepY: 1,
      diagonal: Math.SQRT2,
    });

    expect(distances[1]).toBe(0);
    expect(Number.isFinite(distances[0])).toBe(false);
  });
});
