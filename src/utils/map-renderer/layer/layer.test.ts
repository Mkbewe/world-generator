import { WorldShapeLayer } from './layer';

describe('WorldShapeLayer', () => {
  it('excludes time yielded to the browser from drawing time', async () => {
    let now = 0;
    const clock = vi.spyOn(performance, 'now').mockImplementation(() => now);
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      createImageData: (width: number, height: number) => {
        now += 2;
        return { data: new Uint8ClampedArray(width * height * 4) };
      },
      putImageData: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    const layer = new WorldShapeLayer({ width: 2, height: 1 }, new Uint8Array(2).fill(1));
    try {
      const preparation = layer.prepare(new AbortController().signal, () => {
        now += 3;
      });
      now += 100;
      await preparation;
      expect(now).toBe(110);
      expect(layer.statistics).toEqual({ durationMs: 10, tiles: 2, pixels: 2 });
    } finally {
      layer.dispose();
      getContext.mockRestore();
      clock.mockRestore();
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
    } as unknown as CanvasRenderingContext2D;
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
    const layer = new WorldShapeLayer(
      { width: 4, height: 4 },
      new Uint8Array([0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0])
    );
    try {
      await layer.prepare(new AbortController().signal);
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
