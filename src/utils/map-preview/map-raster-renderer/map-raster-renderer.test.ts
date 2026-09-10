import { MapRasterRenderer } from './map-raster-renderer';

describe('MapRasterRenderer', () => {
  it('renders a base layer', async () => {
    const data = new Uint8ClampedArray(4 * 4 * 4);
    const context = {
      createImageData: vi.fn(() => ({ data })),
      putImageData: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
    const canvas = {
      width: 4,
      height: 4,
      getContext: vi.fn(() => context),
    } as unknown as HTMLCanvasElement;

    const rendered = await new MapRasterRenderer().render(
      canvas,
      { worldMask: new Uint8Array([0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0]) },
      'world-shape'
    );

    expect(rendered).toBe(true);
    expect(context.putImageData).toHaveBeenCalledOnce();
    expect(data[5 * 4 + 3]).toBe(255);
  });
});
