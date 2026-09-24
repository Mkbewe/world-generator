import { createNoiseDisplacement, createRegionDisplacement } from './macro-region-displacement';

describe('createRegionDisplacement', () => {
  it('reuses the dedicated region field for the same seed without reading NoiseStage', () => {
    const noiseAt = vi.fn(() => 0.5);
    const options = { source: 'dedicated' as const, seed: 123, width: 5, height: 5, noiseAt };
    const first = createRegionDisplacement(options);
    const second = createRegionDisplacement(options);
    const different = createRegionDisplacement({ ...options, seed: 456 });

    expect(first.at(0.3, 0.4).bandPosition('x', 0.1)).toEqual(
      second.at(0.3, 0.4).bandPosition('x', 0.1)
    );
    expect(first.at(0.3, 0.4).bandPosition('x', 0.1)).not.toEqual(
      different.at(0.3, 0.4).bandPosition('x', 0.1)
    );
    expect(first.at(0.3, 0.4).ringRadius({ x: 0.5, y: 0.5 }, 0.1)).toEqual(expect.any(Number));
    expect(noiseAt).not.toHaveBeenCalled();
  });

  it('uses the shared noise map only when selected', () => {
    const displacement = createRegionDisplacement({
      source: 'noise-map',
      seed: 123,
      width: 2,
      height: 2,
      noiseAt: () => 0.75,
    });

    expect(displacement.at(0.5, 0.5).ringRadius({ x: 0.5, y: 0.5 }, 1)).toBe(0.5);
    expect(displacement.at(0.5, 0.5).bandPosition('x', 1)).toBe(1);
    expect(() =>
      createRegionDisplacement({ source: 'noise-map', seed: 123, width: 2, height: 2 })
    ).toThrow('unavailable region noise source');
  });
});

describe('createNoiseDisplacement', () => {
  it('interpolates one noise field between grid cells', () => {
    const values = new Float32Array([0, 0.25, 0.75, 1]);
    const displacement = createNoiseDisplacement((x, y) => values[y * 2 + x], 2, 2);

    expect(displacement(0, 0)).toBe(-1);
    expect(displacement(0.5, 0.5)).toBe(0);
    expect(displacement(0.25, 0.5)).toBe(-0.125);
    expect(displacement(1, 1)).toBe(1);
  });

  it('does not sample the field at a spatial offset', () => {
    const noiseAt = vi.fn(() => 0.75);
    const displacement = createNoiseDisplacement(noiseAt, 5, 5);

    expect(displacement(0.5, 0.5)).toBe(0.5);
    expect(noiseAt).toHaveBeenCalledTimes(1);
    expect(noiseAt).toHaveBeenCalledWith(2, 2);
  });

  it('clamps samples to the map edges', () => {
    const values = new Float32Array([0, 0.25, 0.75, 1]);
    const displacement = createNoiseDisplacement((x, y) => values[y * 2 + x], 2, 2);

    expect(displacement(-0.2, 1.2)).toBe(0.5);
  });

  it('ignores masked neighbours instead of treating them as zero noise', () => {
    const displacement = createNoiseDisplacement(
      (x, y) => (x === 0 && y === 0 ? 0.75 : undefined),
      2,
      2
    );

    expect(displacement(0.5, 0.5)).toBe(0.5);
  });

  it('uses neutral displacement when all surrounding cells are outside the mask', () => {
    const displacement = createNoiseDisplacement(() => undefined, 4, 4);

    expect(displacement(0.5, 0.5)).toBe(0);
  });

  it('uses the nearest valid sample when the world edge misses all four neighbours', () => {
    const displacement = createNoiseDisplacement(
      (x, y) => (x === 3 && y === 2 ? 0.75 : undefined),
      5,
      5
    );

    expect(displacement(0.5, 0.5)).toBe(0.5);
  });
});
