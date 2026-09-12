import {
  type LayerCache,
  layerCache,
  LayerQueue,
  type LayerRegistry,
  layerRegistry,
  type MapLayer,
  type MapSize,
} from './layer';
import { RenderMetrics } from './metrics';
import { MapScene } from './scene';
import {
  type MapBaseLayerId,
  type MapLayerOption,
  type MapLayers,
  type MapOverlayId,
  type MapOverlayOption,
  OVERLAY_IDS,
  OVERLAY_LAYERS,
  type RenderStatistics,
} from './types';
import { MapView, type MapViewElements } from './view';

export interface MapRendererState {
  layers: readonly MapLayerOption<MapBaseLayerId>[];
  overlays: readonly MapOverlayOption[];
  displayedLayer?: MapBaseLayerId;
  error?: string;
}

export interface MapRendererOptions {
  selectedLayer?: MapBaseLayerId;
  registry?: LayerRegistry;
  boundarySource?: MapBaseLayerId;
  cache?: LayerCache;
  onRenderStatistics?: (statistics: RenderStatistics) => void;
}

export const EMPTY_RENDER_STATE: MapRendererState = {
  layers: layerRegistry.ids.map(id => ({
    id,
    label: layerRegistry.get(id).label,
    available: false,
  })),
  overlays: OVERLAY_IDS.map(id => ({
    id,
    label: OVERLAY_LAYERS[id].label,
    available: false,
    visible: true,
  })),
};

export class MapRenderer {
  readonly registry: LayerRegistry;
  private readonly scene: MapScene;
  private readonly view: MapView;
  private readonly queue: LayerQueue;
  private readonly metrics: RenderMetrics;
  private lifetime = new AbortController();
  private error?: string;

  constructor(
    elements: MapViewElements,
    private readonly onChange: (state: MapRendererState) => void,
    options: MapRendererOptions = {}
  ) {
    this.registry = options.registry ?? layerRegistry;
    this.scene = new MapScene(options.cache ?? layerCache, this.registry);
    this.metrics = new RenderMetrics(this.registry, options.onRenderStatistics);
    this.view = new MapView(elements, this.metrics, options.selectedLayer, options.boundarySource);
    this.queue = new LayerQueue({
      signal: () => this.lifetime.signal,
      load: (layer, signal) => this.metrics.prepare(layer, signal, this.view.tilePainter(layer)),
      present: layer => this.present(layer),
      fail: (layer, error) => {
        layer.dispose();
        this.reportError(error);
        this.emitRenderStatistics();
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
      layers: this.scene.options,
      overlays: this.view.overlayOptions,
      displayedLayer: this.view.displayedLayer,
      error: this.error,
    };
  }

  start(size: MapSize): void {
    this.reset();
    this.lifetime = new AbortController();
    this.scene.start(size);
    this.metrics.start();
    this.view.start(size);
  }

  /** Displays existing layer data without progressive drawing or generation statistics. */
  load(size: MapSize, data: MapLayers): void {
    this.start(size);
    this.metrics.reset();
    const layers = this.scene.load(data);
    this.view.restoreSelection(layers.at(-1)?.id);
    for (const layer of layers) {
      this.queue.enqueue(layer);
    }
  }

  get size(): MapSize {
    return this.scene.size;
  }

  /** True when every base layer has been added. */
  isComplete(): boolean {
    return this.scene.isComplete();
  }

  add(id: MapBaseLayerId, value: unknown): void {
    this.signal.throwIfAborted();
    this.queue.enqueue(this.scene.add(id, value));
  }

  getLayers(): MapLayers {
    return this.scene.getLayers();
  }

  select(id: MapBaseLayerId): void {
    const layer = this.scene.readyLayer(id);
    if (!layer) {
      return;
    }
    try {
      this.view.select(layer);
      this.emitState();
    } catch (error) {
      this.reportError(error);
    }
  }

  setOverlay(id: MapOverlayId, visible: boolean): void {
    this.view.setOverlay(id, visible);
    this.emitState();
  }

  /** Stops drawing and accepting data for this run, keeping the current preview. */
  cancel(): void {
    this.lifetime.abort();
    this.queue.reset();
  }

  reset(emit = true): void {
    this.cancel();
    this.scene.reset();
    this.error = undefined;
    this.metrics.reset();
    this.view.reset();
    if (emit) {
      this.emitState();
    }
  }

  dispose(): void {
    this.reset(false);
    this.view.dispose();
  }

  private present(layer: MapLayer): void {
    this.scene.markReady(layer);
    this.view.setMasks(this.scene.masks);
    this.view.present(layer);
    this.emitState();
    this.emitRenderStatistics();
  }

  private emitRenderStatistics(): void {
    this.metrics.report(this.scene.values(), this.view.overlayDurationMs, this.view.viewport);
  }

  private reportError(error: unknown): void {
    this.error = error instanceof Error ? error.message : String(error);
    this.emitState();
  }

  private emitState(): void {
    this.onChange(this.state);
  }
}
