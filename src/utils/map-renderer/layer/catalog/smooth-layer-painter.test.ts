import { compilePalette, GEOLOGY_BOUNDARY_STYLE } from '@layers';

import { SmoothLayerPainter } from './smooth-layer-painter';
import { regionBorderDistances } from '../../../grid-distance';
import type { RenderTarget } from '../../preview-targets';
import { layerRegistry } from '../layer-registry';

const size = { width: 4, height: 4 };
const target: RenderTarget = {
  width: 16,
  height: 16,
  projection: { cellSize: 4, left: 0, top: 0, width: 16, height: 16 },
};

/** Float ramp palette used by the tests; the catalog ships only integer rasters. */
const RAMP_PALETTE = {
  kind: 'ramp',
  stops: [
    { at: 0, color: [0, 0, 0] },
    { at: 1, color: [255, 255, 255] },
  ],
} as const;

function pixel(pixels: Uint8ClampedArray, x: number, y: number): number[] {
  return [...pixels.slice((y * target.width + x) * 4, (y * target.width + x + 1) * 4)];
}

describe('SmoothLayerPainter', () => {
  it('resolves a curved region boundary inside source cells at screen resolution', () => {
    const labels = new Uint8Array(16);
    for (let y = 0; y < 4; y++) {
      labels.set([0, 0, 1, 1], y * 4);
    }
    const boundaryAt = (x: number): number => (x < 0.45 ? 0 : 1);
    const painter = new SmoothLayerPainter(
      size,
      labels,
      { size, contains: () => true },
      undefined,
      compilePalette(layerRegistry.raster('macro-region').palette),
      { shape: 'rectangle' },
      'analytic',
      undefined,
      boundaryAt
    );
    const pixels = new Uint8ClampedArray(target.width * target.height * 4);

    painter.paint(pixels, target, { x: 0, y: 0, width: 16, height: 16 });

    expect(painter.boundaryBytes).toBe(16);
    expect(pixel(pixels, 6, 8)).toEqual([46, 125, 50, 255]);
    expect(pixel(pixels, 7, 8)).toEqual([85, 152, 58, 255]);
    expect(pixel(pixels, 8, 8)).toEqual([124, 179, 66, 255]);
  });

  it('treats the skip value as empty area while antialiasing', () => {
    const labels = new Uint8Array([0, 1]);
    const painter = new SmoothLayerPainter(
      { width: 2, height: 1 },
      labels,
      undefined,
      undefined,
      compilePalette({
        kind: 'discrete',
        colors: [
          [120, 160, 90],
          [196, 172, 118],
        ],
        overflow: 'cycle',
        offset: -1,
      }),
      { shape: 'rectangle' },
      'clipped',
      0
    );
    const target: RenderTarget = {
      width: 2,
      height: 1,
      projection: { cellSize: 1, left: 0, top: 0, width: 2, height: 1 },
    };
    const pixels = new Uint8ClampedArray(8);

    painter.paint(pixels, target, { x: 0, y: 0, width: 2, height: 1 });

    // Both boundary pixels blend the nearest structure color; the skipped cell
    // contributes no color of its own. The partial alpha comes from the pixel
    // sampling past the world edge of this degenerate one-row grid.
    expect([...pixels.slice(0, 4)]).toEqual([120, 160, 90, 64]);
    expect([...pixels.slice(4)]).toEqual([120, 160, 90, 64]);
  });

  it('antialiases the world fill at the same ellipse used by the outline', () => {
    const mask = new Uint8Array(16);
    mask[5] = mask[6] = mask[9] = mask[10] = 1;
    const painter = new SmoothLayerPainter(
      size,
      mask,
      undefined,
      1,
      compilePalette(layerRegistry.raster('world-shape').palette),
      { shape: 'disc' },
      'world'
    );
    const pixels = new Uint8ClampedArray(target.width * target.height * 4);

    painter.paint(pixels, target, { x: 0, y: 0, width: 16, height: 16 });

    expect(pixel(pixels, 8, 8)).toEqual([16, 42, 67, 255]);
    expect(pixel(pixels, 0, 0)[3]).toBe(0);
    expect(
      [...pixels].some((_, index) => index % 4 === 3 && pixels[index] > 0 && pixels[index] < 255)
    ).toBe(true);
  });

  it('gives a clipped float pixel partial coverage without sampling black outside cells', () => {
    const mask = new Uint8Array(16);
    mask[5] = mask[6] = mask[9] = mask[10] = 1;
    const noise = new Float32Array(16);
    for (const index of [5, 6, 9, 10]) {
      noise[index] = 0.5;
    }
    const painter = new SmoothLayerPainter(
      size,
      noise,
      { size, contains: (x, y) => mask[y * size.width + x] === 1 },
      undefined,
      compilePalette(RAMP_PALETTE),
      { shape: 'disc' },
      'clipped'
    );
    const pixels = new Uint8ClampedArray(target.width * target.height * 4);

    painter.paint(pixels, target, { x: 0, y: 0, width: 16, height: 16 });

    const partial = Array.from({ length: 16 * 16 }, (_, index) =>
      pixel(pixels, index % 16, Math.floor(index / 16))
    ).filter(([, , , alpha]) => alpha > 0 && alpha < 255);
    expect(partial.length).toBeGreaterThan(0);
    expect(
      partial.every(([red, green, blue]) => red === 128 && green === 128 && blue === 128)
    ).toBe(true);
    expect(pixel(pixels, 0, 0)[3]).toBe(0);
  });

  it('paints categorical gutters and the selected-region band', () => {
    const width = 100;
    const owners = new Int16Array(width);
    owners.fill(1, 50);
    const colors = [
      [94, 204, 176],
      [96, 165, 250],
    ] as const;
    const painter = new SmoothLayerPainter(
      { width, height: 1 },
      owners,
      undefined,
      undefined,
      compilePalette({ kind: 'discrete', colors, overflow: 'cycle' }),
      { shape: 'rectangle' },
      'categorical',
      undefined,
      undefined,
      { distances: regionBorderDistances(owners, width, 1), style: GEOLOGY_BOUNDARY_STYLE }
    );
    const boundaryTarget: RenderTarget = {
      width,
      height: 1,
      projection: { cellSize: 1, left: 0, top: 0, width, height: 1 },
    };
    const tile = { x: 0, y: 0, width, height: 1 };
    const highlighted = new Uint8ClampedArray(width * 4);
    painter.setSelectedOwner(0);
    painter.paint(highlighted, boundaryTarget, tile);
    const plain = new Uint8ClampedArray(width * 4);
    painter.setSelectedOwner(-1);
    painter.paint(plain, boundaryTarget, tile);

    expect(painter.boundaryBytes).toBe(0);
    expect([...highlighted.slice(10 * 4, 10 * 4 + 4)]).toEqual([94, 204, 176, 255]);
    expect([...highlighted.slice(49 * 4, 49 * 4 + 4)]).toEqual([255, 255, 255, 255]);
    expect([...highlighted.slice(50 * 4, 50 * 4 + 4)]).toEqual([255, 255, 255, 255]);
    expect([...highlighted.slice(90 * 4, 90 * 4 + 4)]).toEqual([96, 165, 250, 255]);
    expect(
      Array.from({ length: width }, (_, x) => x).some(
        x => highlighted[x * 4] !== plain[x * 4] || highlighted[x * 4 + 2] !== plain[x * 4 + 2]
      )
    ).toBe(true);
  });

  it('maps gutters from a smaller categorical raster onto the map grid', () => {
    const owners = new Int16Array([0, 0, 1, 1]);
    const mapSize = { width: 20, height: 20 };
    const painter = new SmoothLayerPainter(
      mapSize,
      owners,
      undefined,
      undefined,
      compilePalette({
        kind: 'discrete',
        colors: [
          [94, 204, 176],
          [96, 165, 250],
        ],
        overflow: 'cycle',
      }),
      { shape: 'rectangle' },
      'categorical',
      undefined,
      undefined,
      {
        distances: regionBorderDistances(owners, 2, 2),
        style: GEOLOGY_BOUNDARY_STYLE,
        sourceSize: { width: 2, height: 2 },
      }
    );
    const boundaryTarget: RenderTarget = {
      width: 20,
      height: 20,
      projection: { cellSize: 1, left: 0, top: 0, width: 20, height: 20 },
    };
    const pixels = new Uint8ClampedArray(20 * 20 * 4);

    painter.paint(pixels, boundaryTarget, { x: 0, y: 0, width: 20, height: 20 });

    expect(pixels.slice(0, 4)).toEqual(new Uint8ClampedArray([94, 204, 176, 255]));
    expect(
      Array.from({ length: pixels.length / 4 }, (_, index) =>
        pixels.slice(index * 4, index * 4 + 4)
      ).some(
        ([red, green, blue, alpha]) => red === 255 && green === 255 && blue === 255 && alpha === 255
      )
    ).toBe(true);
  });

  it('omits categorical gutters from the zoom fallback', () => {
    const width = 2;
    const owners = new Int16Array([0, 1]);
    const painter = new SmoothLayerPainter(
      { width, height: 1 },
      owners,
      undefined,
      undefined,
      compilePalette({
        kind: 'discrete',
        colors: [
          [94, 204, 176],
          [96, 165, 250],
        ],
        overflow: 'cycle',
      }),
      { shape: 'rectangle' },
      'categorical',
      undefined,
      undefined,
      { distances: regionBorderDistances(owners, width, 1), style: GEOLOGY_BOUNDARY_STYLE }
    );
    const target: RenderTarget = {
      width,
      height: 1,
      projection: { cellSize: 1, left: 0, top: 0, width, height: 1 },
    };
    const pixels = new Uint8ClampedArray(width * 4);

    painter.paint(pixels, target, { x: 0, y: 0, width, height: 1 }, false);

    expect([...pixels]).toEqual([94, 204, 176, 255, 96, 165, 250, 255]);
  });

  it('keeps low values visible at the world edge across preview scales', () => {
    const values = new Float32Array(16).fill(0.2);
    const painter = new SmoothLayerPainter(
      size,
      values,
      { size, contains: () => true },
      undefined,
      compilePalette(RAMP_PALETTE),
      { shape: 'rectangle' },
      'clipped'
    );

    for (const cellSize of [2, 4]) {
      const width = size.width * cellSize;
      const height = size.height * cellSize;
      const scaled: RenderTarget = {
        width,
        height,
        projection: { cellSize, left: 0, top: 0, width, height },
      };
      const pixels = new Uint8ClampedArray(width * height * 4).fill(255);

      painter.paint(pixels, scaled, { x: 0, y: 0, width, height });

      const offset = ((cellSize - 1) * width + cellSize - 1) * 4;
      expect([...pixels.slice(offset, offset + 4)]).toEqual([51, 51, 51, 255]);
    }
  });
});
