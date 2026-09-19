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

function createLayer(): CatalogLayer {
  return new CatalogLayer(LAYER_CATALOG[0], { width: 2, height: 2 }, new Uint8Array(4).fill(1));
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

  it('renders the displayed layer at the viewport resolution', async () => {
    vi.spyOn(Viewport.prototype, 'measure').mockReturnValue({
      width: 4,
      height: 4,
      devicePixelRatio: 3,
    });
    const elements = createElements();
    const view = new MapView(elements, new RenderMetrics(layerRegistry));
    const layer = createLayer();

    view.start({ width: 2, height: 2 }, 'disc');
    view.present(layer);
    await view.ready;

    expect(elements.canvas.width).toBe(8);
    expect(elements.canvas.height).toBe(8);
    expect(layer.canvas.width).toBe(12);
    expect(layer.canvas.height).toBe(12);
    expect(context.drawImage).toHaveBeenLastCalledWith(layer.canvas, 0, 0, 12, 12, -2, -2, 12, 12);
    view.dispose();
    layer.dispose();
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
});
