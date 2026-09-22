import { layerRegistry } from './layer-registry';
import { SmoothLayerPainter } from './smooth-layer-painter';
import { compilePalette } from '../../map-layers';
import type { RenderTarget } from '../preview-targets';

const size = { width: 4, height: 4 };
const target: RenderTarget = {
  width: 16,
  height: 16,
  projection: { cellSize: 4, left: 0, top: 0, width: 16, height: 16 },
};

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
      compilePalette(layerRegistry.get('macro-region').palette),
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
      compilePalette(layerRegistry.get('landmass-layout').palette),
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
      compilePalette(layerRegistry.get('world-shape').palette),
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

  it('gives a clipped noise pixel partial coverage without sampling black outside cells', () => {
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
      compilePalette(layerRegistry.get('noise').palette),
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
});
