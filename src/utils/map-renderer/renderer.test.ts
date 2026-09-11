import { MapLayer } from './layer';
import { MapRenderer } from './renderer';
import { Viewport } from './viewport';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(complete => {
    resolve = complete;
  });
  return { promise, resolve };
}

function setup() {
  const canvas = document.createElement('canvas');
  const onChange = vi.fn();
  const preview = new MapRenderer(
    {
      canvas,
      overlayCanvas: document.createElement('canvas'),
      viewportElement: document.createElement('div'),
    },
    onChange
  );
  preview.start({ width: 2, height: 2 });
  return { preview, canvas, onChange };
}

describe('MapRenderer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Viewport.prototype, 'start').mockImplementation(() => {});
    vi.spyOn(Viewport.prototype, 'measure').mockReturnValue(undefined);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      createImageData: (width: number, height: number) => ({
        width,
        height,
        data: new Uint8ClampedArray(width * height * 4),
      }),
      putImageData: vi.fn(),
      clearRect: vi.fn(),
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('prepares and presents layers in arrival order', async () => {
    const { preview, onChange } = setup();
    const world = deferred();
    const noise = deferred();
    const prepare = vi
      .spyOn(MapLayer.prototype, 'prepare')
      .mockReturnValueOnce(world.promise)
      .mockReturnValueOnce(noise.promise);
    preview.add('world-shape', new Uint8Array(4).fill(1));
    preview.add('noise', new Float32Array(4).fill(0.5));
    expect(prepare).toHaveBeenCalledTimes(1);

    world.resolve();
    await vi.runAllTimersAsync();
    expect(prepare).toHaveBeenCalledTimes(2);

    noise.resolve();
    await vi.runAllTimersAsync();
    await preview.ready;
    const displayed = onChange.mock.calls.map(([state]) => state.displayedLayer).filter(Boolean);
    expect(displayed).toEqual(['world-shape', 'noise']);
    expect(preview.state.layers.map(layer => layer.id)).toEqual(['world-shape', 'noise']);
  });

  it('switches ready images without starting another render', async () => {
    const { preview } = setup();
    const prepare = vi.spyOn(MapLayer.prototype, 'prepare').mockResolvedValue();
    preview.add('world-shape', new Uint8Array(4).fill(1));
    preview.add('noise', new Float32Array(4));
    await vi.runAllTimersAsync();
    await preview.ready;
    preview.select('world-shape');
    preview.select('noise');
    expect(prepare).toHaveBeenCalledTimes(2);
    expect(preview.state.displayedLayer).toBe('noise');
  });

  it('ignores stale completion after restart', async () => {
    const { preview, onChange } = setup();
    const pending = deferred();
    vi.spyOn(MapLayer.prototype, 'prepare').mockReturnValue(pending.promise);
    preview.add('world-shape', new Uint8Array(4));
    const previousSignal = preview.signal;
    preview.start({ width: 3, height: 3 });
    expect(previousSignal.aborted).toBe(true);
    onChange.mockClear();
    pending.resolve();
    await vi.runAllTimersAsync();
    await preview.ready;
    expect(onChange).not.toHaveBeenCalled();
  });

  it('reports one failed layer and continues presenting the next', async () => {
    const { preview } = setup();
    vi.spyOn(MapLayer.prototype, 'prepare')
      .mockRejectedValueOnce(new Error('Allocation failed'))
      .mockResolvedValueOnce();
    preview.add('world-shape', new Uint8Array(4).fill(1));
    preview.add('noise', new Float32Array(4));
    await vi.runAllTimersAsync();
    await preview.ready;
    expect(preview.state.error).toBe('Allocation failed');
    expect(preview.state.displayedLayer).toBe('noise');
    expect(preview.state.layers[0].available).toBe(false);
  });

  it('restores a cached snapshot', async () => {
    const { preview } = setup();
    vi.spyOn(MapLayer.prototype, 'prepare').mockResolvedValue();
    preview.restore({
      width: 2,
      height: 2,
      size: 2,
      seed: '1',
      shape: 'disc',
      layers: {
        worldMask: new Uint8Array(4).fill(1),
        noiseMap: new Float32Array(4),
      },
    });
    await vi.runAllTimersAsync();
    await preview.ready;
    expect(preview.state.displayedLayer).toBe('noise');
    expect(preview.state.overlays.map(overlay => overlay.id)).toEqual(['world-boundary']);
    expect(preview.state.overlays[0]).toMatchObject({ available: true, visible: true });
  });

  it('exposes rendered layers and the layer range', async () => {
    const { preview } = setup();
    vi.spyOn(MapLayer.prototype, 'prepare').mockResolvedValue();
    preview.restore({
      width: 2,
      height: 2,
      size: 2,
      seed: '1',
      shape: 'disc',
      layers: {
        worldMask: new Uint8Array(4).fill(1),
        noiseMap: new Float32Array([0.25, 0.5, 0.75, 1]),
      },
    });
    await vi.runAllTimersAsync();
    await preview.ready;
    const layers = preview.getLayers();
    expect(layers.worldMask).toBeInstanceOf(Uint8Array);
    expect(layers.noiseMap).toBeInstanceOf(Float32Array);
    expect(preview.range('noise')).toEqual({ min: 0.25, max: 1 });
  });

  it('honours the preferred layer option on restore', async () => {
    const renderer = new MapRenderer(
      {
        canvas: document.createElement('canvas'),
        overlayCanvas: document.createElement('canvas'),
        viewportElement: document.createElement('div'),
      },
      vi.fn(),
      { selectedLayer: 'world-shape' }
    );
    vi.spyOn(MapLayer.prototype, 'prepare').mockResolvedValue();
    renderer.restore({
      width: 2,
      height: 2,
      size: 2,
      seed: '1',
      shape: 'disc',
      layers: {
        worldMask: new Uint8Array(4).fill(1),
        noiseMap: new Float32Array(4),
      },
    });
    await vi.runAllTimersAsync();
    await renderer.ready;
    expect(renderer.state.displayedLayer).toBe('world-shape');
  });

  it('defaults to the last present layer on restore', async () => {
    const { preview } = setup();
    vi.spyOn(MapLayer.prototype, 'prepare').mockResolvedValue();
    preview.restore({
      width: 2,
      height: 2,
      size: 2,
      seed: '1',
      shape: 'disc',
      layers: { worldMask: new Uint8Array(4).fill(1) },
    });
    await vi.runAllTimersAsync();
    await preview.ready;
    expect(preview.state.displayedLayer).toBe('world-shape');
  });
});
