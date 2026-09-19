import { LayerPresenter } from './index';
import { LAYER_CATALOG } from '../../map-layers';
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
  } as unknown as CanvasRenderingContext2D;
}

function createLayer(): CatalogLayer {
  return new CatalogLayer(LAYER_CATALOG[0], { width: 2, height: 2 }, new Uint8Array(4).fill(1));
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

  it('leaves the canvas untouched until a frame is ready', async () => {
    const layer = createLayer();

    presenter.show(layer);
    expect(context.clearRect).not.toHaveBeenCalled();

    presenter.ensure(layer);
    await presenter.ready;
    expect(context.clearRect).toHaveBeenCalled();
    layer.dispose();
  });

  it('keeps the previous frame while the target is repainted', async () => {
    const layer = createLayer();
    presenter.show(layer);
    presenter.ensure(layer);
    await presenter.ready;
    vi.mocked(context.drawImage).mockClear();

    viewTargetValue = target(6, 6, 3, 0, 0);
    presenter.draw();
    expect(context.drawImage).toHaveBeenCalledWith(layer.overview, 0, 0, 512, 512, 0, 0, 6, 6);
    expect(context.drawImage).toHaveBeenCalledWith(layer.canvas, 0, 0, 6, 6, -1.5, -1.5, 9, 9);

    renderTargetValue = target(9, 9, 3, 1.5, 1.5);
    presenter.ensure(layer);
    await presenter.ready;
    expect(context.drawImage).toHaveBeenLastCalledWith(layer.canvas, 0, 0, 9, 9, -1.5, -1.5, 9, 9);
    layer.dispose();
  });

  it('aborts an outdated render when the target changes', async () => {
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

    expect(aborted).toHaveBeenCalled();
    await presenter.ready;
    expect(layer.busy).toBe(false);
    layer.dispose();
  });
});
