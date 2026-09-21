import { CatalogLayer } from './catalog-layer';
import type { MapSize } from './layer';
import { layerRegistry } from './layer-registry';
import type { RenderTarget } from '../preview-targets';

function worldLayer(size: MapSize, data: Uint8Array): CatalogLayer {
  return new CatalogLayer(layerRegistry.get('world-shape'), size, data);
}

function noiseLayer(world: CatalogLayer, data: Float32Array): CatalogLayer {
  return new CatalogLayer(layerRegistry.get('noise'), world.size, data, world);
}

/** Output buffer mapped one pixel per source cell. */
function targetFor(size: MapSize): RenderTarget {
  return {
    width: size.width,
    height: size.height,
    projection: { cellSize: 1, left: 0, top: 0, width: size.width, height: size.height },
  };
}

describe('MapLayer.sample', () => {
  it('reads world shape values and rejects out-of-bounds cells', () => {
    const layer = worldLayer({ width: 2, height: 2 }, new Uint8Array([0, 1, 1, 1]));
    try {
      expect(layer.sample(0, 0)).toBe(0);
      expect(layer.sample(1, 0)).toBe(1);
      expect(layer.sample(2, 0)).toBeUndefined();
      expect(layer.sample(-1, 0)).toBeUndefined();
      expect(layer.sample(0, 2)).toBeUndefined();
    } finally {
      layer.dispose();
    }
  });

  it('reads noise only inside the world mask', () => {
    const world = worldLayer({ width: 2, height: 2 }, new Uint8Array([1, 0, 1, 1]));
    const layer = noiseLayer(world, new Float32Array([0.25, 0.5, 0.75, 1]));
    try {
      expect(layer.sample(0, 0)).toBe(0.25);
      expect(layer.sample(1, 0)).toBeUndefined();
      expect(layer.sample(1, 1)).toBe(1);
    } finally {
      world.dispose();
      layer.dispose();
    }
  });
});

describe('MapLayer rendering lifecycle', () => {
  it('extends overview edge colors for an opaque clipped fallback', async () => {
    const images: Uint8ClampedArray[] = [];
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      createImageData: (width: number, height: number) => {
        const data = new Uint8ClampedArray(width * height * 4);
        images.push(data);
        return { data };
      },
      putImageData: vi.fn(),
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    const layer = worldLayer({ width: 2, height: 2 }, new Uint8Array([1, 0, 0, 0]));
    try {
      await layer.prepare(new AbortController().signal, targetFor(layer.size));
      const overview = images[0];
      const farCorner = (511 * 512 + 511) * 4;
      expect([...overview.slice(farCorner, farCorner + 4)]).toEqual([16, 42, 67, 255]);
    } finally {
      layer.dispose();
      getContext.mockRestore();
    }
  });

  it('excludes time yielded to the browser from drawing time', async () => {
    let now = 0;
    const clock = vi.spyOn(performance, 'now').mockImplementation(() => now);
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      createImageData: (width: number, height: number) => {
        now += 2;
        return { data: new Uint8ClampedArray(width * height * 4) };
      },
      putImageData: vi.fn(),
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    const layer = worldLayer({ width: 2, height: 1 }, new Uint8Array(2).fill(1));
    try {
      const preparation = layer.prepare(
        new AbortController().signal,
        targetFor({ width: 2, height: 1 }),
        () => {
          now += 3;
        }
      );
      now += 100;
      await preparation;
      expect(now).toBe(112);
      expect(layer.statistics).toEqual({ durationMs: 10, tiles: 2, pixels: 2 });
    } finally {
      layer.dispose();
      getContext.mockRestore();
      clock.mockRestore();
    }
  });

  it('starts a fresh render when the pending preparation used an aborted signal', async () => {
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      createImageData: (width: number, height: number) => ({
        data: new Uint8ClampedArray(width * height * 4),
      }),
      putImageData: vi.fn(),
      clearRect: vi.fn(),
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    const layer = worldLayer({ width: 4, height: 4 }, new Uint8Array(16).fill(1));
    try {
      const target = targetFor({ width: 4, height: 4 });
      const aborted = new AbortController();
      const first = layer.prepare(aborted.signal, target);
      aborted.abort();

      const second = layer.prepare(new AbortController().signal, target);

      await expect(second).resolves.toBeUndefined();
      await expect(first).rejects.toThrow();
      expect(layer.statistics?.tiles).toBe(16);
    } finally {
      layer.dispose();
      getContext.mockRestore();
    }
  });

  it('keeps the committed frame until the next render completes', async () => {
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      createImageData: (width: number, height: number) => ({
        data: new Uint8ClampedArray(width * height * 4),
      }),
      putImageData: vi.fn(),
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    const layer = worldLayer({ width: 2, height: 1 }, new Uint8Array(2).fill(1));
    try {
      await layer.prepare(new AbortController().signal, targetFor({ width: 2, height: 1 }));
      expect(layer.canvas.width).toBe(2);
      expect(layer.stage.width).toBe(0);

      const pending = layer.prepare(
        new AbortController().signal,
        targetFor({ width: 4, height: 4 })
      );
      expect(layer.busy).toBe(true);
      expect(layer.renderingTarget?.width).toBe(4);
      expect(layer.stage.width).toBe(4);
      expect(layer.canvas.width).toBe(2);

      await pending;
      expect(layer.canvas.width).toBe(4);
      await vi.waitFor(() => expect(layer.busy).toBe(false));
      expect(layer.renderingTarget).toBeUndefined();
      expect(layer.stage.width).toBe(0);
    } finally {
      layer.dispose();
      getContext.mockRestore();
    }
  });

  it('renders the world shape into opaque pixels', async () => {
    const images: ImageData[] = [];
    const context = {
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
    } as unknown as CanvasRenderingContext2D;
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
    const layer = worldLayer(
      { width: 4, height: 4 },
      new Uint8Array([0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0])
    );
    try {
      await layer.prepare(new AbortController().signal, targetFor({ width: 4, height: 4 }));
      const opaque = images.some(image =>
        image.data.some((value, index) => index % 4 === 3 && value === 255)
      );
      expect(opaque).toBe(true);
      expect(layer.statistics?.tiles).toBe(16);
      expect(layer.statistics?.pixels).toBe(16);
      expect(layer.statistics?.durationMs).toBeGreaterThanOrEqual(0);
    } finally {
      layer.dispose();
      getContext.mockRestore();
    }
  });
});
