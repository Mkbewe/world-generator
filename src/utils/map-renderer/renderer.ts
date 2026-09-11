import {
  LAYER_DEFINITIONS,
  type LayerCache,
  layerCache,
  LayerQueue,
  type MapLayer,
  type MapSize,
  type TileReporter,
  type WorldShapeLayer,
} from './layer';
import { OverlayController } from './overlay-controller';
import type { GeneratedMapSnapshot } from './repository';
import {
  BASE_LAYERS,
  lastPresentLayer,
  type MapBaseLayerId,
  type MapLayerOption,
  type MapLayers,
  type MapOverlayId,
  type MapOverlayOption,
  OVERLAY_LAYERS,
} from './types';

interface MapRendererElements {
  canvas: HTMLCanvasElement;
  overlayCanvas: HTMLCanvasElement;
  viewportElement: HTMLElement;
}

export interface MapRendererState {
  layers: readonly MapLayerOption<MapBaseLayerId>[];
  overlays: readonly MapOverlayOption[];
  displayedLayer?: MapBaseLayerId;
  error?: string;
}

export interface MapRendererOptions {
  selectedLayer?: MapBaseLayerId;
  /** @internal Test seam for injecting a fresh layer cache. */
  cache?: LayerCache;
}

export const EMPTY_RENDER_STATE: MapRendererState = {
  layers: BASE_LAYERS.map(({ id, label }) => ({ id, label, available: false })),
  overlays: OVERLAY_LAYERS.map(({ id, label }) => ({ id, label, available: false, visible: true })),
};

function isPixelData(value: unknown): value is Uint8Array | Float32Array {
  return value instanceof Uint8Array || value instanceof Float32Array;
}

export class MapRenderer {
  private readonly cache: LayerCache;
  private readonly overlays: OverlayController;
  private readonly queue: LayerQueue;
  private lifetime = new AbortController();
  private readonly layerMap = new Map<MapBaseLayerId, MapLayer>();
  private available = new Set<MapBaseLayerId>();
  private displayedLayer?: MapBaseLayerId;
  private auto = true;
  private error?: string;
  private size?: MapSize;
  private selectedLayer?: MapBaseLayerId;

  constructor(
    private readonly elements: MapRendererElements,
    private readonly onChange: (state: MapRendererState) => void,
    options: MapRendererOptions = {}
  ) {
    this.cache = options.cache ?? layerCache;
    this.selectedLayer = options.selectedLayer;
    this.overlays = new OverlayController(elements.overlayCanvas, elements.viewportElement, () =>
      this.refresh()
    );
    this.queue = new LayerQueue({
      signal: () => this.lifetime.signal,
      load: (layer, signal) =>
        layer.prepare(signal, this.auto ? this.tilePainter(layer) : undefined),
      present: layer => this.present(layer),
      fail: (layer, error) => {
        layer.dispose();
        this.reportError(error);
      },
    });
  }

  /** Abort signal for the current run. Capture it to observe cancellation. */
  get signal(): AbortSignal {
    return this.lifetime.signal;
  }

  get ready(): Promise<void> {
    return this.queue.ready;
  }

  get state(): MapRendererState {
    return {
      layers: BASE_LAYERS.map(({ id, label }) => ({
        id,
        label,
        available: this.available.has(id),
      })),
      overlays: OVERLAY_LAYERS.map(({ id, label }) => ({
        id,
        label,
        available: this.boundaryLayer() !== undefined,
        visible: this.overlays.isVisible(id),
      })),
      displayedLayer: this.displayedLayer,
      error: this.error,
    };
  }

  start(size: MapSize): void {
    this.reset();
    this.auto = true;
    this.lifetime = new AbortController();
    this.size = size;
    this.elements.canvas.width = size.width;
    this.elements.canvas.height = size.height;
  }

  restore(snapshot: GeneratedMapSnapshot): void {
    this.start(snapshot);
    this.auto = false;
    this.selectedLayer ??= lastPresentLayer(snapshot.layers);
    for (const { id, source } of BASE_LAYERS) {
      const value = snapshot.layers[source];
      if (value) {
        this.add(id, value);
      }
    }
  }

  add(id: MapBaseLayerId, value: unknown): void {
    const size = this.requireSize();
    const definition = LAYER_DEFINITIONS[id];
    if (this.layerMap.has(id)) {
      throw new Error(`Layer "${id}" already received.`);
    }
    for (const required of definition.requires ?? []) {
      if (!this.layerMap.has(required)) {
        throw new Error(`Layer "${id}" requires "${required}".`);
      }
    }
    if (isPixelData(value) && value.length !== size.width * size.height) {
      throw new Error(`Invalid "${id}" data size.`);
    }
    const layer = definition.build({ size, cache: this.cache, built: this.layerMap }, value);
    this.enqueue(layer);
  }

  getLayers(): MapLayers {
    const layers: MapLayers = {};
    for (const layer of this.layerMap.values()) {
      LAYER_DEFINITIONS[layer.id].write(layers, layer);
    }
    return layers;
  }

  range(id: MapBaseLayerId): { min: number; max: number } | undefined {
    const layer = this.layerMap.get(id);
    return layer ? LAYER_DEFINITIONS[id].range?.(layer) : undefined;
  }

  select(id: MapBaseLayerId): void {
    const layer = this.layerMap.get(id);
    if (!layer || !this.available.has(id)) {
      return;
    }
    this.selectedLayer = id;
    try {
      this.show(layer);
    } catch (error) {
      this.reportError(error);
    }
  }

  setOverlay(id: MapOverlayId, visible: boolean): void {
    this.overlays.setVisible(id, visible);
    this.refresh();
  }

  reset(emit = true): void {
    this.lifetime.abort();
    this.queue.reset();
    this.layerMap.clear();
    this.available.clear();
    this.displayedLayer = undefined;
    this.error = undefined;
    this.size = undefined;
    this.elements.canvas.width = this.elements.canvas.height = 0;
    this.overlays.reset();
    if (emit) {
      this.onChange(EMPTY_RENDER_STATE);
    }
  }

  dispose(): void {
    this.reset(false);
    this.overlays.dispose();
  }

  private requireSize(): MapSize {
    if (!this.size) {
      throw new Error('Map renderer has not been started.');
    }
    return this.size;
  }

  private boundaryLayer(): WorldShapeLayer | undefined {
    for (const layer of this.layerMap.values()) {
      if (LAYER_DEFINITIONS[layer.id].boundary) {
        return layer as WorldShapeLayer;
      }
    }
    return undefined;
  }

  private enqueue(layer: MapLayer): void {
    this.signal.throwIfAborted();
    this.layerMap.set(layer.id, layer);
    this.queue.enqueue(layer);
  }

  private present(layer: MapLayer): void {
    this.available.add(layer.id);
    if (this.auto || layer.id === this.selectedLayer) {
      this.show(layer);
    } else {
      this.refresh();
    }
  }

  private tilePainter(layer: MapLayer): TileReporter {
    const context = this.elements.canvas.getContext('2d');
    return (x, y, width, height) => {
      context?.drawImage(layer.canvas, x, y, width, height, x, y, width, height);
    };
  }

  private show(layer: MapLayer): void {
    layer.show(this.elements.canvas);
    this.available.add(layer.id);
    this.displayedLayer = layer.id;
    this.refresh();
  }

  private reportError(error: unknown): void {
    this.error = error instanceof Error ? error.message : String(error);
    this.refresh();
  }

  private refresh(): void {
    this.overlays.render(this.boundaryLayer());
    this.onChange(this.size ? this.state : EMPTY_RENDER_STATE);
  }
}
