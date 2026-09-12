import {
  LAYER_DEFINITIONS,
  LayerCache,
  type LayerDefinition,
  LayerRegistry,
  MapLayer,
  type MapSize,
} from './layer';
import { MapPersistence } from './persistence';
import { MapRenderer, type MapRendererOptions } from './renderer';
import { type GeneratedMapSnapshot, MapRepository } from './repository';
import type { SpatialMask } from './types';
import { Viewport } from './viewport';
import { WorldBoundaryRenderer } from './world-boundary-renderer';

/** A test-only layer with a different data type from the built-in masks. */
class IslandMaskLayer extends MapLayer implements SpatialMask {
  constructor(
    size: MapSize,
    readonly cells: Uint16Array
  ) {
    super('islands', size);
  }

  contains(x: number, y: number): boolean {
    return this.cells[y * this.size.width + x] > 0;
  }

  protected paintRow(
    pixels: Uint8ClampedArray,
    offset: number,
    y: number,
    xStart: number,
    xEnd: number
  ): void {
    for (let x = xStart; x < xEnd; x++, offset += 4) {
      if (this.contains(x, y)) {
        pixels[offset + 3] = 255;
      }
    }
  }
}

const islands: LayerDefinition = {
  label: 'Islands',
  source: 'islandMask',
  requires: ['noise'],
  build: ({ size }, value) => {
    if (!(value instanceof Uint16Array) || value.length !== size.width * size.height) {
      throw new Error('Invalid island mask.');
    }
    return new IslandMaskLayer(size, value);
  },
  read: layer => (layer as IslandMaskLayer).cells,
  mask: layer => layer as IslandMaskLayer,
};

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(complete => {
    resolve = complete;
  });
  return { promise, resolve };
}

function elements() {
  return {
    canvas: document.createElement('canvas'),
    overlayCanvas: document.createElement('canvas'),
    viewportElement: document.createElement('div'),
  };
}

function snapshot(layers: GeneratedMapSnapshot['layers']): GeneratedMapSnapshot {
  return { width: 2, height: 2, size: 2, seed: '1', shape: 'disc', layers };
}

function setup(options: MapRendererOptions = {}) {
  const onChange = vi.fn();
  const preview = new MapRenderer(elements(), onChange, options);
  preview.start({ width: 2, height: 2 });
  return { preview, onChange };
}

function setupWithSnapshot(
  layers: GeneratedMapSnapshot['layers'],
  options: MapRendererOptions = {}
) {
  const repository = new MapRepository();
  repository.save(snapshot(layers));
  const onChange = vi.fn();
  const preview = new MapRenderer(elements(), onChange, options);
  new MapPersistence(repository).restore(preview);
  return { preview, onChange };
}

describe('MapRenderer', () => {
  it('renders, reports, saves and restores a registered third mask without built-in layer assumptions', async () => {
    const registry = new LayerRegistry({ islands, ...LAYER_DEFINITIONS });
    const cache = new LayerCache();
    const repository = new MapRepository();
    const onRenderStatistics = vi.fn();
    const persistence = new MapPersistence(repository);
    const options = { registry, cache, boundarySource: 'islands', onRenderStatistics };
    const { preview } = setup(options);
    preview.start({ width: 2, height: 2 });
    expect(preview.state.layers.map(layer => layer.id)).toEqual([
      'world-shape',
      'noise',
      'islands',
    ]);
    vi.spyOn(Viewport.prototype, 'measure').mockReturnValue({
      width: 10,
      height: 10,
      devicePixelRatio: 1,
    });
    const boundary = vi
      .spyOn(WorldBoundaryRenderer.prototype, 'render')
      .mockImplementation(() => {});
    preview.add('world-shape', new Uint8Array(4).fill(1));
    preview.add('noise', new Float32Array(4));
    expect(preview.isComplete()).toBe(false);
    const cells = new Uint16Array([1, 0, 0, 1]);
    preview.add('islands', cells);
    await vi.runAllTimersAsync();
    await preview.ready;

    expect(preview.isComplete()).toBe(true);
    expect(preview.state.displayedLayer).toBe('islands');
    expect(preview.state.layers.every(layer => layer.available)).toBe(true);
    expect(boundary).toHaveBeenCalledWith(expect.any(IslandMaskLayer), expect.anything());
    expect(onRenderStatistics.mock.lastCall?.[0].layers.at(-1)).toMatchObject({
      id: 'islands',
      name: 'Islands',
      tiles: 4,
      pixels: 4,
    });
    preview.select('noise');
    preview.select('islands');
    expect(preview.state.displayedLayer).toBe('islands');
    expect(
      persistence.save({
        width: 2,
        height: 2,
        seed: '12',
        shape: 'disc',
        layers: {
          worldMask: new Uint8Array(4).fill(1),
          noiseMap: new Float32Array(4),
          islandMask: cells,
        },
      }).layers.islandMask
    ).toBe(cells);
    preview.dispose();

    const restored = new MapRenderer(elements(), vi.fn(), options);
    onRenderStatistics.mockClear();
    persistence.restore(restored);
    await vi.runAllTimersAsync();
    await restored.ready;
    expect(restored.state.displayedLayer).toBe('islands');
    expect(restored.getLayers().islandMask).toBe(cells);
    expect(onRenderStatistics).not.toHaveBeenCalled();
    restored.reset();
    expect(restored.state.layers.map(layer => layer.id)).toEqual([
      'world-shape',
      'noise',
      'islands',
    ]);
    expect(restored.state.layers.every(layer => !layer.available)).toBe(true);
    restored.dispose();
  });

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
    vi.spyOn(Viewport.prototype, 'measure').mockReturnValue({
      width: 10,
      height: 10,
      devicePixelRatio: 1,
    });
    const renderBoundary = vi
      .spyOn(WorldBoundaryRenderer.prototype, 'render')
      .mockImplementation(() => {});
    const { preview } = setup();
    const prepare = vi.spyOn(MapLayer.prototype, 'prepare').mockResolvedValue();
    preview.add('world-shape', new Uint8Array(4).fill(1));
    preview.add('noise', new Float32Array(4));
    await vi.runAllTimersAsync();
    await preview.ready;
    preview.select('world-shape');
    preview.select('noise');
    expect(prepare).toHaveBeenCalledTimes(2);
    expect(renderBoundary).toHaveBeenCalledOnce();
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

  it('cancels pending drawing while keeping the displayed layer', async () => {
    const { preview } = setup();
    const pending = deferred();
    vi.spyOn(MapLayer.prototype, 'prepare')
      .mockResolvedValueOnce()
      .mockReturnValueOnce(pending.promise);
    preview.add('world-shape', new Uint8Array(4).fill(1));
    await preview.ready;
    preview.add('noise', new Float32Array(4));

    preview.cancel();
    pending.resolve();
    await preview.ready;

    expect(preview.signal.aborted).toBe(true);
    expect(preview.state.displayedLayer).toBe('world-shape');
    expect(preview.state.layers.map(layer => layer.available)).toEqual([true, false]);
    expect(() => preview.add('noise', new Float32Array(4))).toThrow();
    preview.dispose();
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
    const { preview } = setupWithSnapshot({
      worldMask: new Uint8Array(4).fill(1),
      noiseMap: new Float32Array(4),
    });
    vi.spyOn(MapLayer.prototype, 'prepare').mockResolvedValue();

    await vi.runAllTimersAsync();
    await preview.ready;
    expect(preview.state.displayedLayer).toBe('noise');
    expect(preview.state.overlays.map(overlay => overlay.id)).toEqual(['world-boundary']);
    expect(preview.state.overlays[0]).toMatchObject({ available: true, visible: true });
  });

  it('exposes rendered layers', async () => {
    const { preview } = setupWithSnapshot({
      worldMask: new Uint8Array(4).fill(1),
      noiseMap: new Float32Array([0.25, 0.5, 0.75, 1]),
    });
    vi.spyOn(MapLayer.prototype, 'prepare').mockResolvedValue();

    await vi.runAllTimersAsync();
    await preview.ready;
    const layers = preview.getLayers();
    expect(layers.worldMask).toBeInstanceOf(Uint8Array);
    expect(layers.noiseMap).toBeInstanceOf(Float32Array);
  });

  it('honours the preferred layer option on restore', async () => {
    const { preview } = setupWithSnapshot(
      { worldMask: new Uint8Array(4).fill(1), noiseMap: new Float32Array(4) },
      { selectedLayer: 'world-shape' }
    );
    vi.spyOn(MapLayer.prototype, 'prepare').mockResolvedValue();

    await vi.runAllTimersAsync();
    await preview.ready;
    expect(preview.state.displayedLayer).toBe('world-shape');
  });

  it('defaults to the last present layer on restore', async () => {
    const { preview } = setupWithSnapshot({ worldMask: new Uint8Array(4).fill(1) });
    vi.spyOn(MapLayer.prototype, 'prepare').mockResolvedValue();

    await vi.runAllTimersAsync();
    await preview.ready;
    expect(preview.state.displayedLayer).toBe('world-shape');
  });

  it('resumes progressive drawing and statistics when generation follows a loaded map', async () => {
    const onRenderStatistics = vi.fn();
    const { preview } = setupWithSnapshot(
      { worldMask: new Uint8Array(4).fill(1) },
      { cache: new LayerCache(), onRenderStatistics }
    );
    await vi.runAllTimersAsync();
    await preview.ready;
    expect(onRenderStatistics).not.toHaveBeenCalled();

    preview.start({ width: 2, height: 2 });
    preview.add('world-shape', new Uint8Array(4).fill(1));
    preview.add('noise', new Float32Array(4));
    await vi.runAllTimersAsync();
    await preview.ready;

    expect(preview.state.displayedLayer).toBe('noise');
    expect(onRenderStatistics.mock.lastCall?.[0]).toMatchObject({
      firstTileDurationMs: expect.any(Number),
      layers: [{ tiles: 4 }, { tiles: 4 }],
    });
    preview.dispose();
  });

  it('leaves the current rendering run intact when the repository is empty', async () => {
    const { preview } = setup({ cache: new LayerCache() });
    preview.add('world-shape', new Uint8Array(4).fill(1));
    const signal = preview.signal;
    new MapPersistence(new MapRepository()).restore(preview);

    await vi.runAllTimersAsync();
    await preview.ready;
    expect(preview.signal).toBe(signal);
    expect(signal.aborted).toBe(false);
    expect(preview.state.displayedLayer).toBe('world-shape');
    preview.dispose();
  });

  it('reports render statistics for each presented layer', async () => {
    const onRenderStatistics = vi.fn();
    const renderer = new MapRenderer(elements(), vi.fn(), { onRenderStatistics });
    renderer.start({ width: 2, height: 2 });
    vi.spyOn(MapLayer.prototype, 'prepare').mockResolvedValue();

    renderer.add('world-shape', new Uint8Array(4).fill(1));
    await vi.runAllTimersAsync();
    await renderer.ready;

    const latest = onRenderStatistics.mock.calls.at(-1)?.[0];
    expect(latest).toMatchObject({ elapsedDurationMs: expect.any(Number) });
    expect(latest.layers).toEqual([
      expect.objectContaining({ id: 'world-shape', name: 'World shape' }),
    ]);
  });

  it('separates waiting, drawing and presentation and resets timings for cached layers', async () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    vi.spyOn(Viewport.prototype, 'measure').mockReturnValue({
      width: 10,
      height: 10,
      devicePixelRatio: 3,
    });
    vi.spyOn(WorldBoundaryRenderer.prototype, 'render').mockImplementation(() => {
      now += 7;
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      createImageData: (width: number, height: number) => ({
        data: new Uint8ClampedArray(width * height * 4),
      }),
      putImageData: () => {
        now += 3;
      },
      clearRect: vi.fn(),
      drawImage: () => {
        now += 2;
      },
    } as unknown as CanvasRenderingContext2D);
    const onRenderStatistics = vi.fn();
    const { preview } = setup({ onRenderStatistics });
    const mask = new Uint8Array(4).fill(1);
    const noise = new Float32Array(4);
    now += 100;
    preview.add('world-shape', mask);
    await vi.runAllTimersAsync();
    await preview.ready;
    preview.select('world-shape');
    preview.add('noise', noise);
    await vi.runAllTimersAsync();
    await preview.ready;

    expect(onRenderStatistics.mock.lastCall?.[0]).toMatchObject({
      elapsedDurationMs: 153,
      firstTileDurationMs: 105,
      presentationDurationMs: 6,
      overlayDurationMs: 7,
      viewport: { devicePixelRatio: 2 },
      layers: [
        { durationMs: 20, tiles: 4, pixels: 4 },
        { durationMs: 20, tiles: 4, pixels: 4 },
      ],
    });

    preview.start({ width: 2, height: 2 });
    preview.add('world-shape', mask);
    preview.add('noise', noise);
    await vi.runAllTimersAsync();
    await preview.ready;
    expect(onRenderStatistics.mock.lastCall?.[0]).toMatchObject({
      elapsedDurationMs: 11,
      firstTileDurationMs: undefined,
      presentationDurationMs: 4,
      overlayDurationMs: 7,
      layers: [
        { durationMs: 0, tiles: 0, pixels: 0 },
        { durationMs: 0, tiles: 0, pixels: 0 },
      ],
    });
    preview.dispose();
  });
});
