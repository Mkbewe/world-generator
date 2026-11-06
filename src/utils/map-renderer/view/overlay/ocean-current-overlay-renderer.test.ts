import { OceanCurrentOverlayRenderer } from './ocean-current-overlay-renderer';
import type { OverlayFrame } from './overlay-renderer';
import { fitView } from '../view-transform';

function frame(data: Record<string, unknown>): OverlayFrame {
  return {
    canvas: document.createElement('canvas'),
    world: { size: { width: 2, height: 2 }, contains: () => true },
    shape: 'disc',
    viewport: { width: 10, height: 10, devicePixelRatio: 1 },
    view: fitView(),
    data,
    info: {},
  };
}

describe('OceanCurrentOverlayRenderer', () => {
  it('requires both current rasters at the world size', () => {
    const renderer = new OceanCurrentOverlayRenderer();
    const map = new Float32Array(4);
    const strength = new Float32Array(4);

    expect(
      renderer.isAvailable(frame({ oceanCurrentMap: map, oceanCurrentStrength: strength }))
    ).toBe(true);
    expect(renderer.isAvailable(frame({ oceanCurrentMap: map }))).toBe(false);
    expect(renderer.isAvailable(frame({ oceanCurrentStrength: strength }))).toBe(false);
    expect(
      renderer.isAvailable(
        frame({ oceanCurrentMap: map, oceanCurrentStrength: new Float32Array(3) })
      )
    ).toBe(false);
  });

  it('clips the arrow path to the world and strokes it twice', () => {
    const context = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      clip: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      ellipse: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
    const renderer = new OceanCurrentOverlayRenderer();

    renderer.render(
      frame({
        oceanCurrentMap: new Float32Array(4),
        oceanCurrentStrength: new Float32Array(4).fill(0.5),
      })
    );

    expect(context.clip).toHaveBeenCalledOnce();
    expect(context.stroke).toHaveBeenCalledTimes(2);
  });
});
