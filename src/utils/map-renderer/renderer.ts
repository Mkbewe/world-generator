import { hasAllBaseLayers, isBaseLayerId, lastPresentLayer, sourceOf } from './base-layers';
import {
  BASE_LAYER_IDS,
  LAYER_DEFINITIONS,
  type LayerCache,
  layerCache,
  LayerQueue,
  type LayerRenderStatistics,
  type MapLayer,
  type MapSize,
  type TileReporter,
  WorldShapeLayer,
} from './layer';
import { OverlayController } from './overlay-controller';
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
  private readonly overlays: OverlayController;
  private readonly queue: LayerQueue;
  private readonly onRenderStatistics?: (statistics: RenderStatistics) => void;
  private lifetime = new AbortController();
  private readonly layerMap = new Map<MapBaseLayerId, MapLayer>();
  private available = new Set<MapBaseLayerId>();
  private displayedLayer?: MapBaseLayerId;
  private auto = true;
  private error?: string;
  private size?: MapSize;
  private metadata?: MapMetadata;
  private selectedLayer?: MapBaseLayerId;
  private renderStartedAt?: number;
  private firstTileDurationMs?: number;
  private presentationDurationMs = 0;
  private readonly layerStatistics = new Map<MapBaseLayerId, LayerRenderStatistics>();

  constructor(
    private readonly elements: MapRendererElements,
    private readonly onChange: (state: MapRendererState) => void,
    options: MapRendererOptions = {}
  ) {
    this.cache = options.cache ?? layerCache;
    this.repository = options.repository ?? mapRepository;
    this.selectedLayer = options.selectedLayer;
    this.onRenderStatistics = options.onRenderStatistics;
    this.overlays = new OverlayController(elements.overlayCanvas, elements.viewportElement, () =>
      this.overlays.render(this.boundaryLayer())
    );
    this.queue = new LayerQueue({
      signal: () => this.lifetime.signal,
      load: async (layer, signal) => {
        const previous = layer.statistics;
        try {
          await layer.prepare(signal, this.auto ? this.tilePainter(layer) : undefined);
        } finally {
          if (!signal.aborted && layer.statistics && layer.statistics !== previous) {
            this.layerStatistics.set(layer.id, { ...layer.statistics });
          }
        }
      },
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
      overlays: OVERLAY_IDS.map(id => ({
        id,
        label: OVERLAY_LAYERS[id].label,
        available: this.boundaryLayer() !== undefined,
        visible: this.overlays.isVisible(id),
      })),
      displayedLayer: this.displayedLayer,
      error: this.error,
    };
  }

  start(size: MapSize, metadata?: MapMetadata): void {
    this.reset();
    this.auto = true;
    this.lifetime = new AbortController();
    this.size = size;
    this.metadata = metadata;
    this.renderStartedAt = performance.now();
    this.elements.canvas.width = size.width;
    this.elements.canvas.height = size.height;
  }

  restore(): void {
    const snapshot = this.repository.get();
    if (!snapshot) {
      return;
    }
    this.start(snapshot, { seed: snapshot.seed, shape: snapshot.shape });
    this.auto = false;
    this.selectedLayer ??= lastPresentLayer(snapshot.layers);
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
    this.selectedLayer = id;
    try {
      this.show(layer);
    } catch (error) {
      this.reportError(error);
    }
  }

  setOverlay(id: MapOverlayId, visible: boolean): void {
    this.overlays.setVisible(id, visible);
    this.overlays.render(this.boundaryLayer());
    this.emitState();
  }

  reset(emit = true): void {
    this.lifetime.abort();
    this.queue.reset();
    this.layerMap.clear();
    this.available.clear();
    this.displayedLayer = undefined;
    this.error = undefined;
    this.size = undefined;
    this.metadata = undefined;
    this.renderStartedAt = undefined;
    this.firstTileDurationMs = undefined;
    this.presentationDurationMs = 0;
    this.layerStatistics.clear();
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
    this.overlays.render(this.boundaryLayer());
    if (this.auto || layer.id === this.selectedLayer) {
      this.show(layer);
    } else {
      this.emitState();
    }
    this.emitRenderStatistics();
  }

  private emitRenderStatistics(): void {
    if (!this.onRenderStatistics || this.renderStartedAt === undefined || !this.auto) {
      return;
    }
    const startedAt = this.renderStartedAt;
    this.onRenderStatistics({
      elapsedDurationMs: performance.now() - startedAt,
      firstTileDurationMs: this.firstTileDurationMs,
      viewport: this.overlays.size(),
      overlayDurationMs: this.overlays.renderDurationMs,
      presentationDurationMs: this.presentationDurationMs,
      layers: [...this.layerMap.values()].map(layer => ({
        id: layer.id,
        name: LAYER_DEFINITIONS[layer.id].label,
        durationMs: this.layerStatistics.get(layer.id)?.durationMs ?? 0,
        tiles: this.layerStatistics.get(layer.id)?.tiles ?? 0,
        pixels: this.layerStatistics.get(layer.id)?.pixels ?? 0,
        bytes: layer.canvas.width * layer.canvas.height * 4,
      })),
    });
  }

  private tilePainter(layer: MapLayer): TileReporter {
    const context = this.elements.canvas.getContext('2d');
    return (x, y, width, height) => {
      if (!context) {
        return;
      }
      context.drawImage(layer.canvas, x, y, width, height, x, y, width, height);
      if (this.firstTileDurationMs === undefined && this.renderStartedAt !== undefined) {
        this.firstTileDurationMs = performance.now() - this.renderStartedAt;
      }
    };
  }

  private show(layer: MapLayer): void {
    const startedAt = performance.now();
    try {
      layer.show(this.elements.canvas);
    } finally {
      this.presentationDurationMs += performance.now() - startedAt;
    }
    this.available.add(layer.id);
    this.displayedLayer = layer.id;
    this.emitState();
  }

  private reportError(error: unknown): void {
    this.error = error instanceof Error ? error.message : String(error);
    this.emitState();
  }

  private emitState(): void {
    this.onChange(this.size ? this.state : EMPTY_RENDER_STATE);
  }
}
