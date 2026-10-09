import type { Mock } from 'vitest';

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
    layerRegistry.raster('world-shape'),
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
  let onError: Mock<(error: unknown) => void>;

  beforeEach(() => {
    context = createContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
    renderTargetValue = target(6, 6, 2, 1, 1);
    viewTargetValue = target(4, 4, 2, 0, 0);
    onError = vi.fn<(error: unknown) => void>();
    presenter = new LayerPresenter(
      document.createElement('canvas'),
      new RenderMetrics(layerRegistry),
      () => renderTargetValue,
      () => viewTargetValue,
      onError
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('draws a restored layer from its committed frame without rendering again', async () => {
    const layer = createLayer();
    await layer.prepare(new AbortController().signal, target(6, 6, 2, 1, 1));
    const drawImage = vi.mocked(context.drawImage);
    drawImage.mockClear();

    // A fresh presenter attaches to the cached layer, as after a re-mount.
    presenter = new LayerPresenter(
      document.createElement('canvas'),
      new RenderMetrics(layerRegistry),
      () => renderTargetValue,
      () => viewTargetValue,
      onError
    );
    presenter.show(layer);

    expect(drawImage).toHaveBeenCalled();
    expect(context.imageSmoothingEnabled).toBe(false);
    expect(layer.renderingTarget).toBeUndefined();
  });

  it('keeps the last frame instead of drawing a disposed layer', async () => {
    const layer = createLayer();
    const renderTargetValue = target(6, 6, 2, 1, 1);
    await layer.prepare(new AbortController().signal, renderTargetValue);
    presenter.markRendered(layer, renderTargetValue);
    presenter.show(layer);
    vi.mocked(context.drawImage).mockClear();
    vi.mocked(context.clearRect).mockClear();

    layer.dispose();
    presenter.draw();

    expect(context.clearRect).not.toHaveBeenCalled();
    expect(context.drawImage).not.toHaveBeenCalled();
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

  it('clips a presentation-clipped layer once for complete and fallback frames', async () => {
    presenter.setShape('disc');
    const layer = createLayer();
    vi.spyOn(layer, 'presentation', 'get').mockReturnValue({
      ...layer.presentation,
      clipPresentation: true,
    });
    await layer.prepare(new AbortController().signal, target(6, 6, 2, 1, 1));
    presenter.show(layer);
    expect(context.clip).toHaveBeenCalledOnce();

    vi.mocked(context.clip).mockClear();
    viewTargetValue = target(6, 6, 3, 0, 0);
    renderTargetValue = target(9, 9, 3, 1.5, 1.5);
    presenter.draw();
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

  it('replaces an obsolete render when the layer supports cancellation', async () => {
    const signals: AbortSignal[] = [];
    const originalPrepare = MapLayer.prototype.prepare;
    vi.spyOn(MapLayer.prototype, 'prepare').mockImplementation(function (
      this: MapLayer,
      signal: AbortSignal,
      renderTarget: RenderTarget,
      onTile?: TileReporter
    ) {
      signals.push(signal);
      return originalPrepare.call(this, signal, renderTarget, onTile);
    });
    const layer = createLayer();
    vi.spyOn(layer, 'presentation', 'get').mockReturnValue({
      ...layer.presentation,
      cancelStaleRender: true,
    });
    presenter.show(layer);
    presenter.ensure(layer);

    renderTargetValue = target(9, 9, 3, 1.5, 1.5);
    presenter.ensure(layer);
    expect(signals[0]?.aborted).toBe(true);

    await presenter.ready;
    expect(layer.renderedTarget?.width).toBe(9);
    layer.dispose();
  });

  it('uses only the overview while a layer with fixed-width details catches up', async () => {
    const layer = createLayer();
    vi.spyOn(layer, 'presentation', 'get').mockReturnValue({
      ...layer.presentation,
      showStaleFrame: false,
    });
    const details = vi.spyOn(layer, 'paintFallbackDetails');
    await layer.prepare(new AbortController().signal, target(6, 6, 2, 1, 1));
    presenter.show(layer);
    vi.mocked(context.drawImage).mockClear();

    renderTargetValue = target(9, 9, 3, 1.5, 1.5);
    presenter.draw();
    expect(context.drawImage).toHaveBeenCalledWith(layer.overview, 0, 0, 512, 512, 0, 0, 4, 4);
    expect(
      vi.mocked(context.drawImage).mock.calls.some(([surface]) => surface === layer.canvas)
    ).toBe(false);
    expect(details).toHaveBeenCalledOnce();
    layer.dispose();
  });

  it('reports a failed preparation instead of swallowing it', async () => {
    vi.spyOn(MapLayer.prototype, 'prepare').mockRejectedValue(new Error('Allocation failed'));
    const layer = createLayer();

    presenter.show(layer);
    presenter.ensure(layer);
    await presenter.ready;

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'Allocation failed' }));
    layer.dispose();
  });

  it('ignores the rejection of a render the presenter superseded', async () => {
    vi.spyOn(MapLayer.prototype, 'prepare').mockImplementation(
      signal =>
        new Promise((_, reject) => {
          signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        })
    );
    const layer = createLayer();

    presenter.show(layer);
    presenter.ensure(layer);
    presenter.reset();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(onError).not.toHaveBeenCalled();
    layer.dispose();
  });
});
