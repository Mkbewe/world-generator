import { MapView } from './map-view';
import { LAYER_CATALOG } from '../../map-layers';
import { CatalogLayer, layerRegistry } from '../layer';
import { RenderMetrics } from '../metrics';
import { Viewport } from '../viewport';

function createElements() {
  return {
    canvas: document.createElement('canvas'),
    overlayCanvas: document.createElement('canvas'),
    viewportElement: document.createElement('div'),
  };
}

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
    beginPath: vi.fn(),
    arc: vi.fn(),
    rect: vi.fn(),
    stroke: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

async function createLayer(): Promise<CatalogLayer> {
  const layer = new CatalogLayer(
    LAYER_CATALOG[0],
    { width: 2, height: 2 },
    new Uint8Array(4).fill(1)
  );
  await layer.prepare(new AbortController().signal);
  return layer;
}

describe('MapView', () => {
  let context: CanvasRenderingContext2D;

  beforeEach(() => {
    context = createContext();
    vi.spyOn(Viewport.prototype, 'start').mockImplementation(() => {});
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('presents the displayed layer at the viewport resolution', async () => {
    vi.spyOn(Viewport.prototype, 'measure').mockReturnValue({
      width: 4,
      height: 4,
      devicePixelRatio: 3,
    });
    const elements = createElements();
    const view = new MapView(elements, new RenderMetrics(layerRegistry));
    const layer = await createLayer();

    view.start({ width: 2, height: 2 }, 'disc');
    view.present(layer);

    expect(elements.canvas.width).toBe(8);
    expect(elements.canvas.height).toBe(8);
    expect(context.drawImage).toHaveBeenCalledWith(layer.canvas, 0, 0, 2, 2, 0, 0, 8, 8);
    view.dispose();
  });

  it('keeps the raster size until the viewport is measured', () => {
    vi.spyOn(Viewport.prototype, 'measure').mockReturnValue(undefined);
    const elements = createElements();
    const view = new MapView(elements, new RenderMetrics(layerRegistry));

    view.start({ width: 2, height: 2 }, 'disc');

    expect(elements.canvas.width).toBe(2);
    expect(elements.canvas.height).toBe(2);
    view.dispose();
  });

  it('samples the pointer only inside the projected map', () => {
    vi.spyOn(Viewport.prototype, 'measure').mockReturnValue({
      width: 4,
      height: 2,
      devicePixelRatio: 1,
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 400,
      height: 200,
      right: 400,
      bottom: 200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);
    const elements = createElements();
    const view = new MapView(elements, new RenderMetrics(layerRegistry));

    view.start({ width: 2, height: 2 }, 'disc');

    expect(view.samplePointer(200, 100)).toMatchObject({ x: 1, y: 1, u: 0.5, v: 0.5 });
    expect(view.samplePointer(50, 100)).toBeUndefined();
    expect(view.samplePointer(350, 100)).toBeUndefined();
    view.dispose();
  });

  it('repaints at the new resolution after a viewport change', async () => {
    const measure = vi.spyOn(Viewport.prototype, 'measure').mockReturnValue({
      width: 4,
      height: 4,
      devicePixelRatio: 1,
    });
    const elements = createElements();
    const view = new MapView(elements, new RenderMetrics(layerRegistry));
    const layer = await createLayer();
    view.start({ width: 2, height: 2 }, 'disc');
    view.present(layer);
    vi.mocked(context.drawImage).mockClear();

    measure.mockReturnValue({ width: 6, height: 6, devicePixelRatio: 1 });
    view.refresh();

    expect(elements.canvas.width).toBe(6);
    expect(context.drawImage).toHaveBeenCalledWith(layer.canvas, 0, 0, 2, 2, 0, 0, 6, 6);
    view.dispose();
  });
});
