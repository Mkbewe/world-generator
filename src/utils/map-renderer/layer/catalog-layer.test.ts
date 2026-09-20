import { CatalogLayer } from './catalog-layer';
import { LAYER_CATALOG, type LayerSpec } from '../../map-layers';
import type { RenderTarget } from '../preview-targets';

/** Output buffer mapped one pixel per source cell. */
function targetFor(width: number, height: number): RenderTarget {
  return { width, height, projection: { cellSize: 1, left: 0, top: 0, width, height } };
}

/** Single output pixel covering two source cells (minification). */
function targetForHalf(left = 0, top = 0): RenderTarget {
  return {
    width: 1,
    height: 1,
    projection: { cellSize: 0.5, left, top, width: 1, height: 0.5 },
  };
}

/** The first image is the whole-map overview; the rest are output tiles. */
function targetPixels(images: readonly ImageData[]): number[] {
  return images.slice(1).flatMap(image => [...image.data]);
}

function mockCanvasContext(): { images: ImageData[]; restore: () => void } {
  const images: ImageData[] = [];
  const spy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    createImageData: (width: number, height: number) => {
      const image = {
        width,
        height,
        data: new Uint8ClampedArray(width * height * 4),
      } as ImageData;
      images.push(image);
      return image;
    },
    putImageData: vi.fn(),
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  return { images, restore: () => spy.mockRestore() };
}

describe('CatalogLayer', () => {
  it('validates the typed array constructor and cell count from the spec', () => {
    const world = LAYER_CATALOG[0];
    const noise = LAYER_CATALOG[2];

    expect(() => new CatalogLayer(world, { width: 2, height: 2 }, new Float32Array(4))).toThrow(
      'Invalid world mask.'
    );
    expect(() => new CatalogLayer(noise, { width: 2, height: 2 }, new Float32Array(3))).toThrow(
      'data size'
    );
  });

  it('samples raw mask values but paints only the exact inside value', async () => {
    const { images, restore } = mockCanvasContext();
    const layer = new CatalogLayer(
      LAYER_CATALOG[0],
      { width: 3, height: 1 },
      new Uint8Array([0, 1, 2])
    );

    try {
      expect(layer.sample(0, 0)).toBe(0);
      expect(layer.sample(1, 0)).toBe(1);
      expect(layer.sample(3, 0)).toBeUndefined();
      expect(layer.contains(0, 0)).toBe(false);
      expect(layer.contains(1, 0)).toBe(true);
      expect(layer.contains(2, 0)).toBe(false);

      await layer.prepare(new AbortController().signal, targetFor(3, 1));
      const pixels = targetPixels(images);
      expect(pixels).toEqual([0, 0, 0, 0, 16, 42, 67, 255, 0, 0, 0, 0]);
    } finally {
      layer.dispose();
      restore();
    }
  });

  it('clips painting and sampling to another catalog layer', async () => {
    const { images, restore } = mockCanvasContext();
    const size = { width: 2, height: 1 };
    const world = new CatalogLayer(LAYER_CATALOG[0], size, new Uint8Array([1, 0]));
    const noise = new CatalogLayer(LAYER_CATALOG[2], size, new Float32Array([0.5, 1]), world);

    try {
      expect(noise.sample(0, 0)).toBe(0.5);
      expect(noise.sample(1, 0)).toBeUndefined();
      await noise.prepare(new AbortController().signal, targetFor(2, 1));
      const pixels = targetPixels(images);
      expect(pixels).toEqual([128, 128, 128, 255, 0, 0, 0, 0]);
    } finally {
      world.dispose();
      noise.dispose();
      restore();
    }
  });

  it('renders discrete catalog colors with cycling overflow', async () => {
    const { images, restore } = mockCanvasContext();
    const size = { width: 3, height: 1 };
    const world = new CatalogLayer(LAYER_CATALOG[0], size, new Uint8Array([1, 1, 1]));
    const regions = new CatalogLayer(LAYER_CATALOG[1], size, new Uint8Array([0, 1, 8]), world);

    try {
      expect(regions.sample(1, 0)).toBe(1);
      await regions.prepare(new AbortController().signal, targetFor(3, 1));
      const pixels = targetPixels(images);
      expect(pixels).toEqual([46, 125, 50, 255, 124, 179, 66, 255, 46, 125, 50, 255]);
    } finally {
      world.dispose();
      regions.dispose();
      restore();
    }
  });

  it('averages float noise when minifying', async () => {
    const { images, restore } = mockCanvasContext();
    const size = { width: 2, height: 1 };
    const world = new CatalogLayer(LAYER_CATALOG[0], size, new Uint8Array([1, 1]));
    const noise = new CatalogLayer(LAYER_CATALOG[2], size, new Float32Array([0, 1]), world);

    try {
      await noise.prepare(new AbortController().signal, targetForHalf());
      expect(targetPixels(images)).toEqual([128, 128, 128, 255]);
    } finally {
      world.dispose();
      noise.dispose();
      restore();
    }
  });

  it('skips cells outside the clip mask when averaging', async () => {
    const { images, restore } = mockCanvasContext();
    const size = { width: 2, height: 1 };
    const world = new CatalogLayer(LAYER_CATALOG[0], size, new Uint8Array([1, 0]));
    const noise = new CatalogLayer(LAYER_CATALOG[2], size, new Float32Array([1, 1]), world);

    try {
      await noise.prepare(new AbortController().signal, targetForHalf());
      expect(targetPixels(images)).toEqual([255, 255, 255, 255]);
    } finally {
      world.dispose();
      noise.dispose();
      restore();
    }
  });

  it('keeps discrete palettes nearest-neighbour when minifying', async () => {
    const { images, restore } = mockCanvasContext();
    const size = { width: 2, height: 1 };
    const world = new CatalogLayer(LAYER_CATALOG[0], size, new Uint8Array([1, 1]));
    const regions = new CatalogLayer(LAYER_CATALOG[1], size, new Uint8Array([0, 1]), world);

    try {
      await regions.prepare(new AbortController().signal, targetForHalf(0.25, 0.25));
      expect(targetPixels(images)).toEqual([46, 125, 50, 255]);
    } finally {
      world.dispose();
      regions.dispose();
      restore();
    }
  });

  it('requires a matching mask for clipped layers', () => {
    const clipped = {
      id: 'noise',
      label: 'Clipped',
      source: 'clippedMap',
      dataType: 'uint8',
      clipTo: 'world-shape',
      palette: { kind: 'solid', color: [0, 0, 0] },
    } as const satisfies LayerSpec;

    expect(() => new CatalogLayer(clipped, { width: 1, height: 1 }, new Uint8Array(1))).toThrow(
      'requires "world-shape"'
    );
    const wrongSize = {
      size: { width: 2, height: 1 },
      contains: () => true,
    };
    expect(
      () => new CatalogLayer(clipped, { width: 1, height: 1 }, new Uint8Array(1), wrongSize)
    ).toThrow('clip mask size');
  });
});
