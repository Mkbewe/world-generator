import { OverlayInspectorRegistry } from './view/overlay/inspection';
import { OVERLAY_COMPONENTS } from './view/overlay/overlay-components';
import { fitView, isFitted, type ViewTransform } from './view/view-transform';
import {
  isLayerHit,
  layerCache,
  LayerQueue,
  layerRegistry,
  type MapLayer,
  type MapSize,
} from './layer';
import { RenderMetrics } from './metrics';
import { MapScene } from './scene';
import {
  type MapBaseLayerId,
  type MapFeatureSelection,
  type MapInfo,
  type MapInspection,
  type MapLayerOption,
  type MapMetadata,
  type MapOverlayId,
  type MapOverlayInspection,
  type MapOverlayOption,
  type MapSnapshotData,
  type RenderStatistics,
} from './types';
import { type MapPointerSample, MapView, type MapViewElements } from './view';
import { type LayerDataRecord, OVERLAY_IDS, overlayDescriptor } from '../map-layers';
import type { WorldShape } from '../world-shape';

export interface MapRendererState {
  layers: readonly MapLayerOption<MapBaseLayerId>[];
  overlays: readonly MapOverlayOption[];
  displayedLayer?: MapBaseLayerId;
  /** Non-raster information captured with the map, e.g. macro region labels. */
  info: MapInfo;
  /** Current zoom relative to the fitted view; the default zoom shows the whole map. */
  zoom: number;
  /** Current placement of the map in the preview; overlays project with it. */
  viewTransform: ViewTransform;
  /** Whether the view is the default fitted placement. */
  fitted: boolean;
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
      labelKey: layerRegistry.get(id).labelKey,
      available: false,
    })),
    overlays: OVERLAY_IDS.map(id => ({
      id,
      labelKey: overlayDescriptor(id).labelKey,
      available: false,
      visible: overlayDescriptor(id).defaultVisible,
    })),
    info: {},
    zoom: 1,
    viewTransform: fitView(),
    fitted: true,
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
  private overlayData: LayerDataRecord = {};
  private readonly overlayInspectors = new OverlayInspectorRegistry(
    OVERLAY_COMPONENTS.flatMap(component => {
      const inspector = 'createInspector' in component ? component.createInspector() : undefined;
      return inspector ? [inspector] : [];
    })
  );

  constructor(
    elements: MapViewElements,
    private readonly onChange: (state: MapRendererState) => void,
    options: MapRendererOptions = {}
  ) {
    this.scene = new MapScene(layerCache, this.registry);
    this.metrics = new RenderMetrics(this.registry, options.onRenderStatistics);
    this.view = new MapView(
      elements,
      this.metrics,
      error => this.reportError(error),
      options.selectedLayer,
      options.shouldDisplay
    );
    this.queue = new LayerQueue({
      signal: () => this.lifetime.signal,
      begin: (layer, silent) => {
        if (silent) {
          return;
        }
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
      present: (layer, silent) => this.present(layer, silent),
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
      viewTransform: this.view.viewTransform,
      fitted: isFitted(this.view.viewTransform),
      error: this.error,
    };
  }

  /**
   * Begins a run. A scene that already holds the same map size keeps its layers,
   * view transform and selection; only the new layers are prepared.
   */
  start(
    size: MapSize,
    shape: WorldShape,
    regionGeometry?: MapMetadata['regionGeometry'],
    dimensionsMeters?: MapMetadata['dimensionsMeters']
  ): void {
    this.cancel();
    this.lifetime = new AbortController();
    this.scene.start(size, { shape, regionGeometry, dimensionsMeters });
    this.mapSize = size;
    this.error = undefined;
    this.metrics.start();
    this.view.start(size, shape);
  }

  /** Displays existing layer data without progressive drawing or generation statistics. */
  load(snapshot: MapSnapshotData): void {
    this.start(snapshot, snapshot.shape, snapshot.regionGeometry, snapshot.dimensionsMeters);
    this.setInfo(snapshot.info ?? {});
    this.setOverlayData(snapshot.layers);
    this.metrics.reset();
    const layers = this.scene.load(snapshot.layers);
    const rasters = layers.filter(layer => this.registry.get(layer.id).kind === 'raster');
    this.view.restoreSelection(rasters.at(-1)?.id);
    for (const layer of layers) {
      this.queue.enqueue(layer, this.registry.get(layer.id).kind === 'vector');
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

  /** Reads the displayed layer's sample at a source raster cell. */
  inspect(x: number, y: number): MapInspection | undefined {
    const id = this.view.displayedLayer;
    if (!id) {
      return undefined;
    }
    const layer = this.scene.get(id);
    if (!layer) {
      return undefined;
    }
    const spec = this.registry.get(id);
    const sample = layer.sample(x, y);
    if (spec.kind === 'vector') {
      return {
        kind: 'vector',
        layerId: id,
        labelKey: spec.labelKey,
        hit: isLayerHit(sample) ? sample : undefined,
      };
    }
    return {
      kind: 'raster',
      layerId: id,
      labelKey: spec.labelKey,
      value: typeof sample === 'number' ? sample : undefined,
    };
  }

  /** Named overlay values under the pointer, in overlay order. */
  inspectOverlays(x: number, y: number): readonly MapOverlayInspection[] {
    return this.overlayInspectors.inspectAll(
      {
        x,
        y,
        mapSize: this.mapSize,
        data: this.overlayData,
        info: this.info,
      },
      id => this.view.isOverlayActive(id)
    );
  }

  /** Silent layers are prepared without becoming the displayed one; used for replays. */
  add(id: MapBaseLayerId, value: unknown, silent = false): void {
    this.signal.throwIfAborted();
    const [layer, ...unlocked] = this.scene.add(id, value);
    this.queue.enqueue(layer, silent);
    // Layers unlocked by this data follow the same rule as the added one: a
    // fresh run walks through them, a silent replay keeps the view in place.
    for (const extra of unlocked) {
      this.queue.enqueue(extra, silent);
    }
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
    this.view.setOverlayInfo(info);
    // Vector layers join the run like any other layer: the view follows them
    // while a fresh map is being built and leaves an existing selection alone.
    for (const layer of this.scene.setInfo(info)) {
      this.queue.enqueue(layer);
    }
    this.emitState();
  }

  /**
   * Highlights the selected map feature in layers that support it. A
   * selection repaint never takes the view over: the displayed layer is
   * presented again, a hidden one is prepared quietly and shows its highlight
   * once the user selects it.
   */
  setSelection(selection: MapFeatureSelection | undefined): void {
    const displayed = this.view.displayedLayer;
    for (const layer of this.scene.setSelection(selection)) {
      this.queue.enqueue(layer, layer.id !== displayed);
    }
  }

  /** Updates the rasters painted by the overlay canvas; independent of base layers. */
  setOverlayData(data: LayerDataRecord): void {
    this.overlayData = data;
    for (const layer of this.scene.setData(data)) {
      this.queue.enqueue(layer);
    }
    this.view.setOverlayData(data);
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
    this.overlayData = {};
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

  private present(layer: MapLayer, silent = false): void {
    this.scene.markReady(layer);
    this.view.setMasks(this.scene.masks);
    if (!silent) {
      this.view.present(layer);
    }
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
