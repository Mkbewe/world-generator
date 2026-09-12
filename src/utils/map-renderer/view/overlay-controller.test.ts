import { OverlayController } from './overlay-controller';
import type { WorldShapeLayer } from '../layer';
import { Viewport } from '../viewport';
import { WorldBoundaryRenderer } from '../world-boundary-renderer';

function setup() {
  return new OverlayController(
    document.createElement('canvas'),
    document.createElement('div'),
    vi.fn()
  );
}

describe('OverlayController', () => {
  it.each([
    [0.5, 1],
    [1, 1],
    [3, 2],
  ])('reports and uses effective DPR for device DPR %s', (devicePixelRatio, effective) => {
    vi.spyOn(Viewport.prototype, 'measure').mockReturnValue({
      width: 10,
      height: 10,
      devicePixelRatio,
    });
    const render = vi.spyOn(WorldBoundaryRenderer.prototype, 'render').mockImplementation(() => {});
    const controller = setup();
    const world = {} as WorldShapeLayer;
    controller.render(world);
    expect(controller.size()?.devicePixelRatio).toBe(effective);
    expect(render).toHaveBeenCalledWith(world, {
      width: 10,
      height: 10,
      devicePixelRatio: effective,
    });
    controller.dispose();
  });

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
    expect(clear).toHaveBeenCalledOnce();
    controller.dispose();
  });

  it('redraws only when the world, viewport or effective DPR changes', () => {
    const measure = vi.spyOn(Viewport.prototype, 'measure').mockReturnValue({
      width: 10,
      height: 10,
      devicePixelRatio: 3,
    });
    const render = vi.spyOn(WorldBoundaryRenderer.prototype, 'render').mockImplementation(() => {});
    const controller = setup();
    const world = {} as WorldShapeLayer;
    controller.render(world);
    controller.render(world);
    measure.mockReturnValue({ width: 10, height: 10, devicePixelRatio: 4 });
    controller.render(world);
    expect(render).toHaveBeenCalledOnce();

    measure.mockReturnValue({ width: 12, height: 10, devicePixelRatio: 4 });
    controller.render(world);
    measure.mockReturnValue({ width: 12, height: 14, devicePixelRatio: 4 });
    controller.render(world);
    measure.mockReturnValue({ width: 12, height: 14, devicePixelRatio: 1 });
    controller.render(world);
    controller.render({} as WorldShapeLayer);
    expect(render).toHaveBeenCalledTimes(5);
    controller.dispose();
  });

  it('redraws after hiding, losing the viewport and resetting', () => {
    const viewport = { width: 10, height: 10, devicePixelRatio: 1 };
    const measure = vi.spyOn(Viewport.prototype, 'measure').mockReturnValue(viewport);
    const render = vi.spyOn(WorldBoundaryRenderer.prototype, 'render').mockImplementation(() => {});
    const controller = setup();
    const world = {} as WorldShapeLayer;
    controller.render(world);
    controller.setVisible('world-boundary', false);
    controller.render(world);
    controller.setVisible('world-boundary', true);
    controller.render(world);
    measure.mockReturnValue(undefined);
    controller.render(world);
    measure.mockReturnValue(viewport);
    controller.render(world);
    controller.reset();
    controller.render(world);
    expect(render).toHaveBeenCalledTimes(4);
    controller.dispose();
  });

  it('retries failed drawing instead of caching it', () => {
    vi.spyOn(Viewport.prototype, 'measure').mockReturnValue({
      width: 10,
      height: 10,
      devicePixelRatio: 1,
    });
    const render = vi
      .spyOn(WorldBoundaryRenderer.prototype, 'render')
      .mockImplementationOnce(() => {
        throw new Error('Drawing failed');
      })
      .mockImplementation(() => {});
    const controller = setup();
    const world = {} as WorldShapeLayer;
    controller.render(world);
    controller.render(world);
    controller.render(world);
    expect(render).toHaveBeenCalledTimes(2);
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
