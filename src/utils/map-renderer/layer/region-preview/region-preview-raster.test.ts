import {
  extendRegionOwners,
  paintRegionPixels,
  regionBorderDistances,
} from './region-preview-raster';

describe('region preview gutter', () => {
  it('extends region colour beneath the smooth world outline', () => {
    const owners = new Int16Array(25).fill(-1);
    owners[12] = 0;
    const extended = extendRegionOwners(owners, 5, 5);
    expect(owners[0]).toBe(-1);
    expect(extended.every(owner => owner === 0)).toBe(true);

    const pixels = new Uint8ClampedArray(25 * 4);
    paintRegionPixels(pixels, {
      owners: extended,
      distances: regionBorderDistances(extended, 5, 5),
      rasterWidth: 5,
      rasterHeight: 5,
      colors: [[94, 204, 176]],
      mapSize: { width: 5, height: 5 },
      projection: { cellSize: 1, left: 0, top: 0, width: 5, height: 5 },
      left: 0,
      top: 0,
      width: 5,
      height: 5,
    });
    expect([...pixels.slice(4 * 4, 4 * 4 + 4)]).toEqual([94, 204, 176, 255]);
  });

  it('leaves an opaque white gap while retaining neon interiors', () => {
    const owners = new Int16Array(10);
    owners.fill(1, 5);
    const pixels = new Uint8ClampedArray(100 * 4);
    paintRegionPixels(pixels, {
      owners,
      distances: regionBorderDistances(owners, 10, 1),
      rasterWidth: 10,
      rasterHeight: 1,
      colors: [
        [94, 204, 176],
        [96, 165, 250],
      ],
      mapSize: { width: 100, height: 1 },
      projection: { cellSize: 1, left: 0, top: 0, width: 100, height: 1 },
      left: 0,
      top: 0,
      width: 100,
      height: 1,
    });
    expect([...pixels.slice(10 * 4, 10 * 4 + 4)]).toEqual([94, 204, 176, 255]);
    expect([...pixels.slice(90 * 4, 90 * 4 + 4)]).toEqual([96, 165, 250, 255]);
    expect([...pixels.slice(49 * 4, 49 * 4 + 4)]).toEqual([255, 255, 255, 255]);
    expect([...pixels.slice(50 * 4, 50 * 4 + 4)]).toEqual([255, 255, 255, 255]);
  });

  it('omits fixed-pixel gutters from the zoom fallback', () => {
    const owners = new Int16Array([0, 1]);
    const pixels = new Uint8ClampedArray(2 * 4);
    paintRegionPixels(pixels, {
      owners,
      distances: regionBorderDistances(owners, 2, 1),
      rasterWidth: 2,
      rasterHeight: 1,
      colors: [
        [94, 204, 176],
        [96, 165, 250],
      ],
      mapSize: { width: 2, height: 1 },
      projection: { cellSize: 1, left: 0, top: 0, width: 2, height: 1 },
      left: 0,
      top: 0,
      width: 2,
      height: 1,
      showGutters: false,
    });
    expect([...pixels]).toEqual([94, 204, 176, 255, 96, 165, 250, 255]);
  });
});
