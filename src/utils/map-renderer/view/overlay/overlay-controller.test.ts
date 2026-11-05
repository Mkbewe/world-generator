import { HeatZoneOverlayRenderer } from './heat-zone-overlay-renderer';
import { OverlayController } from './overlay-controller';
import type { SpatialMask } from '../../types';
import { Viewport } from '../../viewport';
import { WorldBoundaryRenderer } from '../../world-boundary-renderer';
import { fitView } from '../view-transform';

function setup() {
  const viewport = new Viewport(document.createElement('div'), vi.fn());
  return new OverlayController(document.createElement('canvas'), viewport);
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
    const render = vi.spyOn(WorldBoundaryRenderer.prototype, 'stroke').mockImplementation(() => {});
    const controller = setup();
    const world = {} as SpatialMask;
    controller.render(world, 'disc', fitView());
    expect(controller.size()?.devicePixelRatio).toBe(effective);
    expect(render).toHaveBeenCalledWith(
      world,
      {
        width: 10,
        height: 10,
        devicePixelRatio: effective,
      },
      'disc',
      fitView()
    );
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
    expect(controller.isVisible('heat-zones')).toBe(true);
    controller.setVisible('world-boundary', false);
    controller.setVisible('heat-zones', false);
    expect(controller.isVisible('world-boundary')).toBe(false);
    expect(controller.isVisible('heat-zones')).toBe(false);
  });

  it('draws heat zones over the boundary when their data is available', () => {
    vi.spyOn(Viewport.prototype, 'measure').mockReturnValue({
      width: 10,
      height: 10,
      devicePixelRatio: 1,
    });
    vi.spyOn(WorldBoundaryRenderer.prototype, 'stroke').mockImplementation(() => {});
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      save: vi.fn(),
      restore: vi.fn(),
      clearRect: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    const drawZones = vi
      .spyOn(HeatZoneOverlayRenderer.prototype, 'render')
      .mockImplementation(() => {});
    const controller = setup();
    const world: SpatialMask = {
      size: { width: 1, height: 1 },
      contains: () => true,
    };
    const map = new Int16Array([0]);
    const info = {
      heatZoneInfo: [{ id: 'cold', label: 'Cold', thermal: 'cold' as const }],
    };

    controller.render(world, 'disc', fitView(), { heatZoneMap: map }, info);

    expect(drawZones).toHaveBeenCalledWith(
      expect.objectContaining({
        world,
        view: fitView(),
        data: { heatZoneMap: map },
        info,
        viewport: { width: 10, height: 10, devicePixelRatio: 1 },
      })
    );
  });

  it('does not draw hidden heat zones', () => {
    vi.spyOn(Viewport.prototype, 'measure').mockReturnValue({
      width: 10,
      height: 10,
      devicePixelRatio: 1,
    });
    vi.spyOn(WorldBoundaryRenderer.prototype, 'stroke').mockImplementation(() => {});
    const drawZones = vi
      .spyOn(HeatZoneOverlayRenderer.prototype, 'render')
      .mockImplementation(() => {});
    const controller = setup();
    const world: SpatialMask = {
      size: { width: 1, height: 1 },
      contains: () => true,
    };

    controller.setVisible('heat-zones', false);
    controller.render(
      world,
      'disc',
      fitView(),
      { heatZoneMap: new Int16Array([0]) },
      { heatZoneInfo: [{ id: 'cold', label: 'Cold', thermal: 'cold' as const }] }
    );

    expect(drawZones).not.toHaveBeenCalled();
  });

  it('renders the boundary only when a world and viewport are available', () => {
    vi.spyOn(Viewport.prototype, 'measure').mockReturnValue({
      width: 10,
      height: 10,
      devicePixelRatio: 1,
    });
    const render = vi.spyOn(WorldBoundaryRenderer.prototype, 'stroke').mockImplementation(() => {});
    const clear = vi.spyOn(WorldBoundaryRenderer.prototype, 'clear').mockImplementation(() => {});
    const controller = setup();
    const world = {} as SpatialMask;

    controller.render(world, 'disc', fitView());
    expect(render).toHaveBeenCalledWith(world, expect.anything(), 'disc', fitView());

    controller.render(world, undefined, fitView());
    expect(clear).toHaveBeenCalledOnce();
    expect(render).toHaveBeenCalledOnce();

    controller.render(world, 'disc', fitView());
    expect(render).toHaveBeenCalledTimes(2);

    controller.setVisible('world-boundary', false);
    controller.render(world, 'disc', fitView());
    expect(clear).toHaveBeenCalledTimes(2);

    controller.render(undefined, undefined, fitView());
    expect(clear).toHaveBeenCalledTimes(2);
  });

  it('redraws only when the world, viewport or effective DPR changes', () => {
    const measure = vi.spyOn(Viewport.prototype, 'measure').mockReturnValue({
      width: 10,
      height: 10,
      devicePixelRatio: 3,
    });
    const render = vi.spyOn(WorldBoundaryRenderer.prototype, 'stroke').mockImplementation(() => {});
    const controller = setup();
    const world = {} as SpatialMask;
    controller.render(world, 'disc', fitView());
    controller.render(world, 'disc', fitView());
    measure.mockReturnValue({ width: 10, height: 10, devicePixelRatio: 4 });
    controller.render(world, 'disc', fitView());
    expect(render).toHaveBeenCalledOnce();

    measure.mockReturnValue({ width: 12, height: 10, devicePixelRatio: 4 });
    controller.render(world, 'disc', fitView());
    measure.mockReturnValue({ width: 12, height: 14, devicePixelRatio: 4 });
    controller.render(world, 'disc', fitView());
    measure.mockReturnValue({ width: 12, height: 14, devicePixelRatio: 1 });
    controller.render(world, 'disc', fitView());
    controller.render({} as SpatialMask, 'disc', fitView());
    expect(render).toHaveBeenCalledTimes(5);
  });

  it('redraws after hiding, losing the viewport and resetting', () => {
    const viewport = { width: 10, height: 10, devicePixelRatio: 1 };
    const measure = vi.spyOn(Viewport.prototype, 'measure').mockReturnValue(viewport);
    const render = vi.spyOn(WorldBoundaryRenderer.prototype, 'stroke').mockImplementation(() => {});
    const controller = setup();
    const world = {} as SpatialMask;
    controller.render(world, 'disc', fitView());
    controller.setVisible('world-boundary', false);
    controller.render(world, 'disc', fitView());
    controller.setVisible('world-boundary', true);
    controller.render(world, 'disc', fitView());
    measure.mockReturnValue(undefined);
    controller.render(world, 'disc', fitView());
    measure.mockReturnValue(viewport);
    controller.render(world, 'disc', fitView());
    controller.reset();
    controller.render(world, 'disc', fitView());
    expect(render).toHaveBeenCalledTimes(4);
  });

  it('retries failed drawing instead of caching it', () => {
    vi.spyOn(Viewport.prototype, 'measure').mockReturnValue({
      width: 10,
      height: 10,
      devicePixelRatio: 1,
    });
    const render = vi
      .spyOn(WorldBoundaryRenderer.prototype, 'stroke')
      .mockImplementationOnce(() => {
        throw new Error('Drawing failed');
      })
      .mockImplementation(() => {});
    const controller = setup();
    const world = {} as SpatialMask;
    controller.render(world, 'disc', fitView());
    controller.render(world, 'disc', fitView());
    controller.render(world, 'disc', fitView());
    expect(render).toHaveBeenCalledTimes(2);
  });

  it('clears the overlay and restores defaults on reset', () => {
    const clear = vi.spyOn(WorldBoundaryRenderer.prototype, 'clear').mockImplementation(() => {});
    const controller = setup();

    controller.setVisible('world-boundary', false);
    controller.reset();

    expect(controller.isVisible('world-boundary')).toBe(true);
    expect(clear).toHaveBeenCalledOnce();
  });
});
