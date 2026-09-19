import type { ViewTransform } from './view/view-transform';
import { layerCache, LayerQueue, layerRegistry, type MapLayer, type MapSize } from './layer';
import { RenderMetrics } from './metrics';
import { MapScene } from './scene';
import {
  type MapBaseLayerId,
  type MapInfo,
  type MapInspection,
  type MapLayerOption,
  type MapOverlayId,
  type MapOverlayOption,
  type MapSnapshotData,
  OVERLAY_IDS,
  OVERLAY_LAYERS,
  type RenderStatistics,
} from './types';
import { type MapPointerSample, MapView, type MapViewElements } from './view';
import type { WorldShape } from '../world-shape';

export interface MapRendererState {
  layers: readonly MapLayerOption<MapBaseLayerId>[];
  overlays: readonly MapOverlayOption[];
  displayedLayer?: MapBaseLayerId;
  /** Non-raster information captured with the map, e.g. macro region labels. */
  info: MapInfo;
  /** Current zoom relative to the fitted view; 1 shows the whole map. */
  zoom: number;
  error?: string;
}

export interface MapRendererOptions {
  selectedLayer?: MapBaseLayerId;
  /** Decides which layers may draw while a run is progressive; defaults to all. */
  shouldDisplay?: (id: MapBaseLayerId) => boolean;
  onRenderStatistics?: (statistics: RenderStatistics) => void;
}

export function emptyRenderState(): MapRendererState {
  return {
    layers: layerRegistry.order.map(id => ({
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
    info: {},
    zoom: 1,
  };
}

export class MapRenderer {
  readonly registry = layerRegistry;
  private readonly scene: MapScene;
  private readonly view: MapView;
  private readonly queue: LayerQueue;
  private readonly metrics: RenderMetrics;
  private lifetime = new AbortController();
  private error?: string;
  private mapSize?: MapSize;
  private info: MapInfo = {};

  constructor(
    elements: MapViewElements,
    private readonly onChange: (state: MapRendererState) => void,
    options: MapRendererOptions = {}
  ) {
    this.scene = new MapScene(layerCache, this.registry);
    this.metrics = new RenderMetrics(this.registry, options.onRenderStatistics);
    this.view = new MapView(elements, this.metrics, options.selectedLayer, options.shouldDisplay);
    this.queue = new LayerQueue({
      signal: () => this.lifetime.signal,
      begin: layer => {
        this.view.begin(layer);
        this.emitState();
      },
      load: async (layer, signal) => {
        const target = this.view.renderTarget();
        if (!target) {
          return;
        }
        try {
          await this.metrics.prepare(layer, signal, target, this.view.tilePainter(layer));
          this.view.markRendered(layer, target);
        } catch (error) {
          // Rendering failed; the queue discards the layer and reports the error.
          throw error;
        }
      },
      present: layer => this.present(layer),
      fail: (layer, error) => {
        this.scene.discard(layer);
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
      info: this.info,
      zoom: this.view.viewTransform.scale,
      error: this.error,
    };
  }

  start(size: MapSize, shape: WorldShape): void {
    this.reset();
    this.lifetime = new AbortController();
    this.scene.start(size);
    this.mapSize = size;
    this.metrics.start();
    this.view.start(size, shape);
  }

  /** Displays existing layer data without progressive drawing or generation statistics. */
  load(snapshot: MapSnapshotData): void {
    this.start(snapshot, snapshot.shape);
    this.setInfo(snapshot.info ?? {});
    this.metrics.reset();
    const layers = this.scene.load(snapshot.layers);
    this.view.restoreSelection(layers.at(-1)?.id);
    for (const layer of layers) {
      this.queue.enqueue(layer);
    }
  }

  get size(): MapSize {
    return this.scene.size;
  }

  /** Size of the current map, or undefined before the first run. */
  get currentSize(): MapSize | undefined {
    return this.mapSize;
  }

  /** Current zoom and pan of the preview. */
  get viewTransform(): ViewTransform {
    return this.view.viewTransform;
  }

  /** Reads the displayed layer's raw value at a source raster cell. */
  inspect(x: number, y: number): MapInspection | undefined {
    const id = this.view.displayedLayer;
    if (!id) {
      return undefined;
    }
    const layer = this.scene.get(id);
    if (!layer) {
      return undefined;
    }
    return { id, label: this.registry.get(id).label, value: layer.sample(x, y) };
  }

  add(id: MapBaseLayerId, value: unknown): void {
    this.signal.throwIfAborted();
    this.queue.enqueue(this.scene.add(id, value));
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

  /** Zooms around a client point, keeping the map cell under it in place. */
  zoomAtPointer(clientX: number, clientY: number, factor: number): void {
    if (this.view.zoomAtPointer(clientX, clientY, factor)) {
      this.emitState();
    }
  }

  /** Pans the map by a pointer delta in CSS pixels. */
  panByPixels(deltaX: number, deltaY: number): void {
    if (this.view.panByPixels(deltaX, deltaY)) {
      this.emitState();
    }
  }

  /** Zooms to the next discrete step around the preview centre. */
  zoomIn(): void {
    if (this.view.zoomIn()) {
      this.emitState();
    }
  }

  /** Zooms to the previous discrete step around the preview centre. */
  zoomOut(): void {
    if (this.view.zoomOut()) {
      this.emitState();
    }
  }

  /** Returns the view to the fitted map. */
  resetView(): void {
    if (this.view.resetView()) {
      this.emitState();
    }
  }

  /** Cell and map coordinates of a client point, clamped to the map bounds. */
  samplePointer(clientX: number, clientY: number): MapPointerSample | undefined {
    return this.view.samplePointer(clientX, clientY);
  }

  /** Keeps non-raster information captured with the current map. */
  setInfo(info: MapInfo): void {
    this.info = info;
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
    this.mapSize = undefined;
    this.info = {};
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
    this.metrics.report(this.scene.values(), this.view.overlayDurationMs, this.view.viewportSize);
  }

  private reportError(error: unknown): void {
    this.error = error instanceof Error ? error.message : String(error);
    this.emitState();
  }

  private emitState(): void {
    this.onChange(this.state);
  }
}
