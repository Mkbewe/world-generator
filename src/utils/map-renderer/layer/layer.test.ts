import { WorldShapeLayer } from './layer';

describe('WorldShapeLayer', () => {
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
      expect(layer.statistics?.durationMs).toBeGreaterThanOrEqual(0);
    } finally {
      layer.dispose();
      getContext.mockRestore();
    }
  });
});
