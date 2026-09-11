import type { WorldShapeLayer } from './layer';
import { OverlayController } from './overlay-controller';
import { Viewport } from './viewport';
import { WorldBoundaryRenderer } from './world-boundary-renderer';

function setup() {
  return new OverlayController(
    document.createElement('canvas'),
    document.createElement('div'),
    vi.fn()
  );
}

describe('OverlayController', () => {
  beforeEach(() => {
    vi.spyOn(Viewport.prototype, 'start').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is visible by default and toggles visibility', () => {
    const controller = setup();

    expect(controller.isVisible('world-boundary')).toBe(true);
    controller.setVisible('world-boundary', false);
    expect(controller.isVisible('world-boundary')).toBe(false);
    controller.dispose();
  });

  it('renders the boundary only when a world and viewport are available', () => {
    vi.spyOn(Viewport.prototype, 'measure').mockReturnValue({
      width: 10,
      height: 10,
      devicePixelRatio: 1,
    });
    const render = vi.spyOn(WorldBoundaryRenderer.prototype, 'render').mockImplementation(() => {});
    const clear = vi.spyOn(WorldBoundaryRenderer.prototype, 'clear').mockImplementation(() => {});
    const controller = setup();
    const world = {} as WorldShapeLayer;

    controller.render(world);
    expect(render).toHaveBeenCalledWith(world, expect.anything());

    controller.setVisible('world-boundary', false);
    controller.render(world);
    expect(clear).toHaveBeenCalledOnce();

    controller.render(undefined);
    expect(clear).toHaveBeenCalledTimes(2);
    controller.dispose();
  });

  it('clears the overlay and restores defaults on reset', () => {
    const clear = vi.spyOn(WorldBoundaryRenderer.prototype, 'clear').mockImplementation(() => {});
    const controller = setup();

    controller.setVisible('world-boundary', false);
    controller.reset();

    expect(controller.isVisible('world-boundary')).toBe(true);
    expect(clear).toHaveBeenCalledOnce();
    controller.dispose();
  });
});
