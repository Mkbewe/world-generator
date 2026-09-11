import { WorldBoundaryRenderer } from './world-boundary-renderer';
import { WorldShapeLayer } from '../layer';

describe('WorldBoundaryRenderer', () => {
  it('renders the boundary at display resolution with capped pixel ratio', () => {
    const data = new Uint8ClampedArray(8 * 8 * 4);
    const context = {
      clearRect: vi.fn(),
      createImageData: vi.fn(() => ({ data, width: 8, height: 8 })),
      putImageData: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => context),
    } as unknown as HTMLCanvasElement;

    const world = new WorldShapeLayer({ width: 4, height: 4 }, new Uint8Array(16).fill(1));
    new WorldBoundaryRenderer(canvas).render(world, { width: 4, height: 4, devicePixelRatio: 3 });
    world.dispose();

    expect(canvas.width).toBe(8);
    expect(canvas.height).toBe(8);
    expect(context.putImageData).toHaveBeenCalledOnce();
    expect(data.some(value => value === 230)).toBe(true);
  });
});
