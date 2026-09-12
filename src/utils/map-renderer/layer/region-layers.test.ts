import { WorldShapeLayer } from './layer';
import { MacroRegionLayer } from './macro-region-layer';
import { ProgressionLayer } from './progression-layer';

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
  } as unknown as CanvasRenderingContext2D);
  return { images, restore: () => spy.mockRestore() };
}

describe('ProgressionLayer', () => {
  it('paints a green-to-red gradient inside the world mask', async () => {
    const { images, restore } = mockCanvasContext();
    const world = new WorldShapeLayer({ width: 4, height: 1 }, new Uint8Array([1, 1, 1, 1]));
    const layer = new ProgressionLayer(world, new Float32Array([0, 0.5, 1, 0]));

    try {
      await layer.prepare(new AbortController().signal);
      const pixels = images.flatMap(image => [...image.data]);

      expect(pixels.slice(0, 4)).toEqual([27, 94, 32, 255]);
      expect(pixels.slice(4, 8)).toEqual([249, 168, 37, 255]);
      expect(pixels.slice(8, 12)).toEqual([183, 28, 28, 255]);
    } finally {
      layer.dispose();
      restore();
    }
  });

  it('leaves cells outside the world mask transparent', async () => {
    const { images, restore } = mockCanvasContext();
    const world = new WorldShapeLayer({ width: 2, height: 1 }, new Uint8Array([1, 0]));
    const layer = new ProgressionLayer(world, new Float32Array([0, 0]));

    try {
      await layer.prepare(new AbortController().signal);
      const pixels = images.flatMap(image => [...image.data]);

      expect(pixels[3]).toBe(255);
      expect(pixels[7]).toBe(0);
    } finally {
      layer.dispose();
      restore();
    }
  });
});

describe('MacroRegionLayer', () => {
  it('paints distinct colors per region id', async () => {
    const { images, restore } = mockCanvasContext();
    const world = new WorldShapeLayer({ width: 3, height: 1 }, new Uint8Array([1, 1, 1]));
    const layer = new MacroRegionLayer(world, new Uint8Array([0, 1, 2]));

    try {
      await layer.prepare(new AbortController().signal);
      const pixels = images.flatMap(image => [...image.data]);

      const first = pixels.slice(0, 3);
      const second = pixels.slice(4, 7);
      const third = pixels.slice(8, 11);

      expect(first).not.toEqual(second);
      expect(second).not.toEqual(third);
      expect(pixels[3]).toBe(255);
      expect(pixels[7]).toBe(255);
    } finally {
      layer.dispose();
      restore();
    }
  });
});
