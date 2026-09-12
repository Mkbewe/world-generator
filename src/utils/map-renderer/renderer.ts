import { hasAllBaseLayers, isBaseLayerId, lastPresentLayer, sourceOf } from './base-layers';
import {
  BASE_LAYER_IDS,
  LAYER_DEFINITIONS,
  type LayerCache,
  layerCache,
  LayerQueue,
  type MapLayer,
  type MapSize,
  WorldShapeLayer,
} from './layer';
import { MapView, type MapViewElements } from './map-view';
import { RenderMetrics } from './render-metrics';
import { type GeneratedMapSnapshot, type MapRepository, mapRepository } from './repository';
import {
  type MapBaseLayerId,
  type MapLayerOption,
  type MapLayers,
  type MapMetadata,
  type MapOverlayId,
  type MapOverlayOption,
  OVERLAY_IDS,
  OVERLAY_LAYERS,
  type RenderStatistics,
} from './types';

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
  /** @internal Test seam for injecting a fresh map repository. */
  repository?: MapRepository;
  /** Reports render statistics from the generation pass. */
  onRenderStatistics?: (statistics: RenderStatistics) => void;
}

export const EMPTY_RENDER_STATE: MapRendererState = {
  layers: BASE_LAYER_IDS.map(id => ({
    id,
    label: LAYER_DEFINITIONS[id].label,
    available: false,
  })),
  overlays: OVERLAY_IDS.map(id => ({
    id,
    label: OVERLAY_LAYERS[id].label,
    available: false,
    visible: true,
  })),
};

function isPixelData(value: unknown): value is Uint8Array | Float32Array {
  return value instanceof Uint8Array || value instanceof Float32Array;
}

export class MapRenderer {
  private readonly cache: LayerCache;
  private readonly repository: MapRepository;
  private readonly view: MapView;
  private readonly queue: LayerQueue;
  private readonly metrics: RenderMetrics;
  private lifetime = new AbortController();
  private readonly layerMap = new Map<MapBaseLayerId, MapLayer>();
  private available = new Set<MapBaseLayerId>();
  private error?: string;
  private size?: MapSize;
  private metadata?: MapMetadata;

  constructor(
    elements: MapViewElements,
    private readonly onChange: (state: MapRendererState) => void,
    options: MapRendererOptions = {}
  ) {
    this.cache = options.cache ?? layerCache;
    this.repository = options.repository ?? mapRepository;
    this.metrics = new RenderMetrics(options.onRenderStatistics);
    this.view = new MapView(elements, this.metrics, options.selectedLayer);
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
      layers: BASE_LAYER_IDS.map(id => ({
        id,
        label: LAYER_DEFINITIONS[id].label,
        available: this.available.has(id),
      })),
      overlays: this.view.overlayOptions,
      displayedLayer: this.view.displayedLayer,
      error: this.error,
    };
  }

  start(size: MapSize, metadata?: MapMetadata): void {
    this.reset();
    this.lifetime = new AbortController();
    this.size = size;
    this.metadata = metadata;
    this.metrics.start();
    this.view.start(size);
  }

  restore(): void {
    const snapshot = this.repository.get();
    if (!snapshot) {
      return;
    }
    this.start(snapshot, { seed: snapshot.seed, shape: snapshot.shape });
    this.metrics.reset();
    this.view.restoreSelection(lastPresentLayer(snapshot.layers));
    for (const id of BASE_LAYER_IDS) {
      const value = snapshot.layers[sourceOf(id)];
      if (value) {
        this.add(id, value);
      }
    }
  }

  /** True when every base layer has been added. */
  isComplete(): boolean {
    return hasAllBaseLayers(this.getLayers());
  }

  /** Persists the current map (metadata + layers) in the repository. */
  save(): GeneratedMapSnapshot {
    const size = this.requireSize();
    if (!this.metadata) {
      throw new Error('Cannot save the map before it has been started.');
    }
    const snapshot: GeneratedMapSnapshot = {
      width: size.width,
      height: size.height,
      size: size.width,
      seed: this.metadata.seed,
      shape: this.metadata.shape,
      layers: this.getLayers(),
    };
    this.repository.save(snapshot);
    return snapshot;
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

  /** Adds a layer from a pipeline stage-completed data record. */
  addStageData(stageId: string, data: Record<string, unknown>): void {
    if (isBaseLayerId(stageId)) {
      this.add(stageId, data[sourceOf(stageId)]);
    }
  }

  getLayers(): MapLayers {
    const layers: MapLayers = {};
    for (const layer of this.layerMap.values()) {
      LAYER_DEFINITIONS[layer.id].write(layers, layer);
    }
    return layers;
  }

  select(id: MapBaseLayerId): void {
    const layer = this.layerMap.get(id);
    if (!layer || !this.available.has(id)) {
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

  reset(emit = true): void {
    this.lifetime.abort();
    this.queue.reset();
    this.layerMap.clear();
    this.available.clear();
    this.error = undefined;
    this.size = undefined;
    this.metadata = undefined;
    this.metrics.reset();
    this.view.reset();
    if (emit) {
      this.onChange(EMPTY_RENDER_STATE);
    }
  }

  dispose(): void {
    this.reset(false);
    this.view.dispose();
  }

  private requireSize(): MapSize {
    if (!this.size) {
      throw new Error('Map renderer has not been started.');
    }
    return this.size;
  }

  private boundaryLayer(): WorldShapeLayer | undefined {
    const layer = this.layerMap.get('world-shape');
    return layer instanceof WorldShapeLayer ? layer : undefined;
  }

  private enqueue(layer: MapLayer): void {
    this.signal.throwIfAborted();
    this.layerMap.set(layer.id, layer);
    this.queue.enqueue(layer);
  }

  private present(layer: MapLayer): void {
    this.available.add(layer.id);
    this.view.setMask(this.boundaryLayer());
    this.view.present(layer);
    this.emitState();
    this.emitRenderStatistics();
  }

  private emitRenderStatistics(): void {
    this.metrics.report(this.layerMap.values(), this.view.overlayDurationMs, this.view.viewport);
  }

  private reportError(error: unknown): void {
    this.error = error instanceof Error ? error.message : String(error);
    this.emitState();
  }

  private emitState(): void {
    this.onChange(this.size ? this.state : EMPTY_RENDER_STATE);
  }
}
