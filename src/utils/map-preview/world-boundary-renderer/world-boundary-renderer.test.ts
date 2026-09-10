import { WorldBoundaryRenderer } from './world-boundary-renderer';

describe('WorldBoundaryRenderer', () => {
  it('renders the boundary at display resolution with capped pixel ratio', () => {
    const data = new Uint8ClampedArray(8 * 8 * 4);
    const context = {
      clearRect: vi.fn(),
      createImageData: vi.fn(() => ({ data })),
      putImageData: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => context),
    } as unknown as HTMLCanvasElement;

    new WorldBoundaryRenderer().render({
      canvas,
      worldMask: new Uint8Array(16).fill(1),
      sourceWidth: 4,
      sourceHeight: 4,
      displayWidth: 4,
      displayHeight: 4,
      devicePixelRatio: 3,
    });

    expect(canvas.width).toBe(8);
    expect(canvas.height).toBe(8);
    expect(context.putImageData).toHaveBeenCalledOnce();
    expect(data.some(value => value === 230)).toBe(true);
  });
});
