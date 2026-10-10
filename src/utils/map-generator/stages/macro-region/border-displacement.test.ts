import { createRegionDisplacement } from './border-displacement';

describe('createRegionDisplacement', () => {
  it('reuses the dedicated region field for the same seed', () => {
    const first = createRegionDisplacement(123);
    const second = createRegionDisplacement(123);
    const different = createRegionDisplacement(456);

    expect(first.at(0.3, 0.4).bandPosition('x', 0.1)).toEqual(
      second.at(0.3, 0.4).bandPosition('x', 0.1)
    );
    expect(first.at(0.3, 0.4).bandPosition('x', 0.1)).not.toEqual(
      different.at(0.3, 0.4).bandPosition('x', 0.1)
    );
    expect(first.at(0.3, 0.4).ringRadius({ x: 0.5, y: 0.5 }, 0.1)).toEqual(expect.any(Number));
  });

  it('keeps the geometric coordinate when the amplitude is zero', () => {
    const cell = createRegionDisplacement(123).at(0.3, 0.4);

    expect(cell.bandPosition('x', 0)).toBe(0.3);
    expect(cell.bandPosition('y', 0)).toBe(0.4);
    expect(cell.ringRadius({ x: 0.3, y: 0.4 }, 0)).toBe(0);
  });
});
