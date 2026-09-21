import { LayerPresenter } from './index';
import { CatalogLayer, layerRegistry, MapLayer, type TileReporter } from '../layer';
import { RenderMetrics } from '../metrics';
import type { RenderTarget } from '../preview-targets';

function createContext(): CanvasRenderingContext2D {
  return {
    createImageData: (width: number, height: number) => ({
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4),
    }),
    putImageData: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    ellipse: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

function createLayer(): CatalogLayer {
  return new CatalogLayer(
    layerRegistry.get('world-shape'),
    { width: 2, height: 2 },
    new Uint8Array(4).fill(1)
  );
}

function target(
  width: number,
  height: number,
  cellSize: number,
  left: number,
  top: number
): RenderTarget {
  return { width, height, projection: { cellSize, left, top, width, height } };
}

describe('LayerPresenter', () => {
  let context: CanvasRenderingContext2D;
  let renderTargetValue: RenderTarget | undefined;
  let viewTargetValue: RenderTarget | undefined;
  let presenter: LayerPresenter;

  beforeEach(() => {
    context = createContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
    renderTargetValue = target(6, 6, 2, 1, 1);
    viewTargetValue = target(4, 4, 2, 0, 0);
    presenter = new LayerPresenter(
      document.createElement('canvas'),
      new RenderMetrics(layerRegistry),
      () => renderTargetValue,
      () => viewTargetValue
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the first tile before the whole frame is ready', async () => {
    const layer = createLayer();

    presenter.show(layer);
    expect(context.clearRect).not.toHaveBeenCalled();

    presenter.ensure(layer);
    expect(layer.busy).toBe(true);
    expect(context.drawImage).toHaveBeenCalledWith(layer.stage, 0, 0, 6, 6, -1, -1, 6, 6);
    await presenter.ready;
    expect(context.clearRect).toHaveBeenCalled();
    layer.dispose();
  });

  it('keeps finished stage tiles when the view is redrawn', async () => {
    const layer = createLayer();
    presenter.show(layer);
    presenter.ensure(layer);
    vi.mocked(context.drawImage).mockClear();

    presenter.draw();

    expect(context.drawImage).toHaveBeenCalledWith(layer.stage, 0, 0, 6, 6, -1, -1, 6, 6);
    await presenter.ready;
    layer.dispose();
  });

  it('keeps the previous frame while the target is repainted', async () => {
    const layer = createLayer();
    presenter.show(layer);
    presenter.ensure(layer);
    await presenter.ready;
    vi.mocked(context.drawImage).mockClear();

    viewTargetValue = target(6, 6, 3, 0, 0);
    renderTargetValue = target(9, 9, 3, 1.5, 1.5);
    presenter.draw();
    expect(context.drawImage).toHaveBeenCalledWith(layer.overview, 0, 0, 512, 512, 0, 0, 6, 6);
    expect(context.drawImage).toHaveBeenCalledWith(layer.canvas, 0, 0, 6, 6, -1.5, -1.5, 9, 9);

    presenter.ensure(layer);
    await presenter.ready;
    expect(context.drawImage).toHaveBeenLastCalledWith(layer.canvas, 0, 0, 9, 9, -1.5, -1.5, 9, 9);
    layer.dispose();
  });

  it('uses a sharp world clip for fallback and removes it under a finished frame', async () => {
    presenter.setShape('disc');
    const layer = createLayer();
    presenter.show(layer);
    presenter.ensure(layer);
    await presenter.ready;
    vi.mocked(context.drawImage).mockClear();
    vi.mocked(context.clip).mockClear();

    presenter.draw();
    expect(
      vi.mocked(context.drawImage).mock.calls.some(([surface]) => surface === layer.overview)
    ).toBe(false);
    expect(context.clip).not.toHaveBeenCalled();

    viewTargetValue = target(6, 6, 3, 0, 0);
    renderTargetValue = target(9, 9, 3, 1.5, 1.5);
    presenter.draw();
    expect(context.drawImage).toHaveBeenCalledWith(layer.overview, 0, 0, 512, 512, 0, 0, 6, 6);
    expect(context.ellipse).toHaveBeenCalledWith(3, 3, 1.5, 1.5, 0, 0, Math.PI * 2);
    expect(context.clip).toHaveBeenCalledOnce();
    layer.dispose();
  });

  it('finishes an in-flight frame and then catches up with the latest target', async () => {
    const aborted = vi.fn();
    const originalPrepare = MapLayer.prototype.prepare;
    vi.spyOn(MapLayer.prototype, 'prepare').mockImplementation(function (
      this: MapLayer,
      signal: AbortSignal,
      renderTarget: RenderTarget,
      onTile?: TileReporter
    ) {
      signal.addEventListener('abort', aborted);
      return originalPrepare.call(this, signal, renderTarget, onTile);
    });
    const layer = createLayer();

    presenter.show(layer);
    presenter.ensure(layer);
    renderTargetValue = target(9, 9, 3, 1.5, 1.5);
    presenter.ensure(layer);

    expect(aborted).not.toHaveBeenCalled();
    await presenter.ready;
    expect(layer.busy).toBe(false);
    expect(layer.canvas.width).toBe(9);
    layer.dispose();
  });

  it('collapses intermediate targets into one follow-up render', async () => {
    const originalPrepare = MapLayer.prototype.prepare;
    const prepared: RenderTarget[] = [];
    vi.spyOn(MapLayer.prototype, 'prepare').mockImplementation(function (
      this: MapLayer,
      signal: AbortSignal,
      renderTarget: RenderTarget,
      onTile?: TileReporter
    ) {
      prepared.push(renderTarget);
      return originalPrepare.call(this, signal, renderTarget, onTile);
    });
    const layer = createLayer();

    presenter.show(layer);
    presenter.ensure(layer);
    renderTargetValue = target(9, 9, 3, 1.5, 1.5);
    presenter.ensure(layer);
    renderTargetValue = target(12, 12, 3, 3, 3);
    presenter.ensure(layer);
    await presenter.ready;

    expect(prepared).toHaveLength(2);
    expect(prepared[1]).toMatchObject({ width: 12, height: 12 });
    layer.dispose();
  });
});
