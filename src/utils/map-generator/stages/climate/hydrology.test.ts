import { buildHydrology } from './hydrology';
import type { WorldDimensions } from '../../../world-dimensions';

function dimensionsOf(sampleWidth: number, sampleHeight: number): WorldDimensions {
  return {
    widthMeters: sampleWidth,
    heightMeters: sampleHeight,
    sampleWidth,
    sampleHeight,
  };
}

function inputOf(
  sampleWidth: number,
  sampleHeight: number,
  heightmap: Float32Array,
  moisture = 0.5
) {
  const cells = sampleWidth * sampleHeight;
  return {
    worldMask: new Uint8Array(cells).fill(1),
    heightmap,
    moistureMap: new Float32Array(cells).fill(moisture),
    dimensions: dimensionsOf(sampleWidth, sampleHeight),
  };
}

describe('buildHydrology', () => {
  it('accumulates runoff downhill into rivers', () => {
    const result = buildHydrology(inputOf(5, 1, new Float32Array([50, 40, 30, 20, 10])));

    expect(result.lakeMap.every(value => value === 0)).toBe(true);
    expect(result.riverMap[0]).toBe(0);
    expect(result.riverMap[1]).toBeGreaterThan(0);
    expect(result.riverMap[2]).toBeGreaterThan(result.riverMap[1]);
    expect(result.riverMap[4]).toBeGreaterThan(result.riverMap[3]);
  });

  it('fills a closed depression into a lake and labels its basin', () => {
    const heights = new Float32Array([
      100, 100, 100, 100, 100, 100, 50, 50, 50, 100, 100, 50, 10, 50, 100, 100, 50, 50, 50, 100,
      100, 100, 100, 100, 100,
    ]);
    const result = buildHydrology(inputOf(5, 5, heights));

    expect(result.lakeMap[12]).toBe(1);
    expect(result.lakeMap[0]).toBe(0);
    expect(result.basinCount).toBe(1);
    expect(result.basinMap[12]).toBe(1);
    expect(result.basinMap[6]).toBe(1);
  });

  it('keeps rivers and lakes off the sea and outside the world', () => {
    const heights = new Float32Array([-100, -100, 50, 40, 30]);
    const result = buildHydrology(inputOf(5, 1, heights));

    expect(result.riverMap[0]).toBe(0);
    expect(result.riverMap[1]).toBe(0);
    expect(result.lakeMap[0]).toBe(0);
    expect(result.lakeMap[1]).toBe(0);
  });

  it('seeds the mask boundary when an all-land world has no water', () => {
    const size = 7;
    const cells = size * size;
    const worldMask = new Uint8Array(cells);
    const heightmap = new Float32Array(cells).fill(100);
    for (let y = 1; y < 6; y++) {
      for (let x = 1; x < 6; x++) {
        worldMask[y * size + x] = 1;
      }
    }
    heightmap[3 * size + 3] = 10;

    const result = buildHydrology({
      worldMask,
      heightmap,
      moistureMap: new Float32Array(cells).fill(0.5),
      dimensions: dimensionsOf(size, size),
    });

    expect(result.lakeMap[3 * size + 3]).toBe(1);
    expect(result.basinCount).toBe(1);
  });

  it('routes lake runoff to a lower outlet', () => {
    const heights = new Float32Array([
      100, 100, 100, 100, 60, 100, 10, 10, 10, 100, 100, 10, 10, 10, 100, 100, 10, 10, 10, 100, 100,
      100, 100, 100, 100,
    ]);
    const result = buildHydrology(inputOf(5, 5, heights));

    expect(result.lakeMap[12]).toBe(1);
    expect(result.riverMap[4]).toBeGreaterThan(0);
  });

  it('is deterministic for the same inputs', () => {
    const heights = new Float32Array([50, 40, 30, 20, 10]);
    const input = inputOf(5, 1, heights);

    const first = buildHydrology(input);
    const second = buildHydrology(input);

    expect(Array.from(second.riverMap)).toEqual(Array.from(first.riverMap));
    expect(Array.from(second.lakeMap)).toEqual(Array.from(first.lakeMap));
    expect(Array.from(second.basinMap)).toEqual(Array.from(first.basinMap));
  });
});
