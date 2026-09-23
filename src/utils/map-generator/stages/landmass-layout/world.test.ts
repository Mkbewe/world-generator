import { createMaskSampler, createShapeSampler } from './world';

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
