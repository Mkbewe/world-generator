import { OverlayController } from './overlay/overlay-controller';
import {
  fitView,
  nextZoomScale,
  panBy,
  previousZoomScale,
  type ViewTransform,
  withScale,
  zoomAt,
} from './view-transform';
import {
  type LayerDataRecord,
  type MapBaseLayerId,
  type MapInfo,
  OVERLAY_IDS,
  type OverlayDescriptor,
  overlayDescriptor,
} from '../../map-layers';
import type { WorldShape } from '../../world-shape';
import { type MapLayer, type MapSize, matchesMapSize, type TileReporter } from '../layer';
import { LayerPresenter } from '../layer-presenter';
import type { RenderMetrics } from '../metrics';
import { type MapPointerSample, pointerAnchor, samplePointer } from '../pointer-sampling';
import {
  presentationSize,
  type RenderTarget,
  renderTarget as renderTargetFor,
  viewTarget as viewTargetFor,
} from '../preview-targets';
import { type MapOverlayId, type SpatialMask } from '../types';
import { Viewport, type ViewportSize } from '../viewport';

export interface MapViewElements {
  canvas: HTMLCanvasElement;
  overlayCanvas: HTMLCanvasElement;
  viewportElement: HTMLElement;
}

/** Owns the preview surfaces, the view transform and the user's layer selection. */
export class MapView {
  private readonly overlays: OverlayController;
  private readonly presenter: LayerPresenter;
  private readonly viewport: Viewport;
  private masks: ReadonlyMap<MapBaseLayerId, SpatialMask> = new Map();
  private shape?: WorldShape;
  private overlayData: LayerDataRecord = {};
  private overlayInfo: MapInfo = {};
  private size?: MapSize;
  private presented?: MapLayer;
  private view: ViewTransform = fitView();
  private progressive = true;
  private selectedLayer?: MapBaseLayerId;

  constructor(
    private readonly elements: MapViewElements,
    metrics: RenderMetrics,
    onError: (error: unknown) => void,
    selectedLayer?: MapBaseLayerId,
    private readonly shouldDisplay: (id: MapBaseLayerId) => boolean = () => true
  ) {
    this.selectedLayer = selectedLayer;
    this.viewport = new Viewport(elements.viewportElement, () => this.refresh());
    this.overlays = new OverlayController(elements.overlayCanvas, this.viewport);
    this.presenter = new LayerPresenter(
      elements.canvas,
      metrics,
      () => this.renderTarget(),
      () => this.viewTarget(),
      onError
    );
  }

  get displayedLayer(): MapBaseLayerId | undefined {
    return this.presented?.id;
  }

  isOverlayVisible(id: MapOverlayId): boolean {
    return this.overlays.isVisible(id);
  }

  /** Whether an overlay draws and reports values: visible and not suppressed. */
  isOverlayActive(id: MapOverlayId): boolean {
    return this.isOverlayVisible(id) && !this.suppressedOverlayIds().has(id);
  }

  get viewportSize(): ViewportSize | undefined {
    return this.overlays.size();
  }

  get viewTransform(): ViewTransform {
    return this.view;
  }

  get overlayDurationMs(): number {
    return this.overlays.renderDurationMs;
  }

  /** Completes when the displayed layer has caught up with the current view. */
  get ready(): Promise<void> {
    return this.presenter.ready;
  }

  get overlayOptions() {
    const suppressed = this.suppressedOverlayIds();
    return OVERLAY_IDS.map(id => {
      const descriptor = overlayDescriptor(id);
      return {
        id,
        labelKey: descriptor.labelKey,
        available: this.overlayAvailable(descriptor),
        visible: this.overlays.isVisible(id),
        disabled: suppressed.has(id),
      };
    });
  }

  /**
   * Begins a map. The view transform and the displayed layer survive while the
   * sample grid keeps its size, so a selective run never blanks the preview.
   * A continuing map keeps its layer; a fresh one follows the drawn stages —
   * `WorldGenerationPreview` reads `displayedLayer` right after this to decide
   * whether the preview should follow the run, so both rules must stay equal.
   */
  start(size: MapSize, shape: WorldShape): void {
    const continuing = matchesMapSize(this.size, size) && this.presented !== undefined;
    if (!continuing) {
      this.view = fitView();
      this.presented = undefined;
      this.presenter.reset();
      this.overlayData = {};
      this.overlayInfo = {};
    }
    this.progressive = !continuing;
    if (this.presented) {
      this.selectedLayer = this.presented.id;
    }
    this.shape = shape;
    this.presenter.setShape(shape);
    this.size = size;
    this.viewport.start();
    this.applyTargetSize();
  }

  restoreSelection(fallback?: MapBaseLayerId): void {
    this.progressive = false;
    this.selectedLayer ??= fallback;
  }

  setMasks(masks: ReadonlyMap<MapBaseLayerId, SpatialMask>): void {
    this.masks = masks;
    this.renderOverlays();
  }

  setOverlayData(data: LayerDataRecord): void {
    this.overlayData = data;
    this.renderOverlays();
  }

  setOverlayInfo(info: MapInfo): void {
    this.overlayInfo = info;
    this.renderOverlays();
  }

  begin(layer: MapLayer): void {
    const restored = layer.renderedTarget !== undefined;
    if ((this.progressive || restored) && this.shouldDisplay(layer.id)) {
      this.presented = layer;
      this.presenter.show(layer);
    }
  }

  present(layer: MapLayer): void {
    if (this.displays(layer)) {
      this.show(layer);
    }
  }

  select(layer: MapLayer): void {
    this.selectedLayer = layer.id;
    this.show(layer);
  }

  setOverlay(id: MapOverlayId, visible: boolean): void {
    this.overlays.setVisible(id, visible);
    this.renderOverlays();
  }

  /** Zooms around a client point; returns whether the view changed. */
  zoomAtPointer(clientX: number, clientY: number, factor: number): boolean {
    const size = this.size;
    const anchor = pointerAnchor(this.elements.canvas, clientX, clientY);
    if (!size || !anchor) {
      return false;
    }
    return this.applyView(zoomAt(this.view, this.canvasSize(), size, anchor.x, anchor.y, factor));
  }

  /** Zooms to the next discrete step around the preview centre. */
  zoomIn(): boolean {
    return this.setScale(nextZoomScale(this.view.scale));
  }

  /** Zooms to the previous discrete step around the preview centre. */
  zoomOut(): boolean {
    return this.setScale(previousZoomScale(this.view.scale));
  }

  /** Returns the view to the fitted map. */
  resetView(): boolean {
    return this.applyView(fitView());
  }

  /** Pans the map by a pointer delta in CSS pixels. */
  panByPixels(deltaX: number, deltaY: number): boolean {
    const size = this.size;
    const rect = this.elements.canvas.getBoundingClientRect();
    if (!size || rect.width <= 0 || rect.height <= 0) {
      return false;
    }
    const canvas = this.canvasSize();
    return this.applyView(
      panBy(
        this.view,
        canvas,
        size,
        deltaX * (canvas.width / rect.width),
        deltaY * (canvas.height / rect.height)
      )
    );
  }

  /** Cell and map coordinates of a client point, or undefined outside the map. */
  samplePointer(clientX: number, clientY: number): MapPointerSample | undefined {
    const size = this.size;
    const target = this.viewTarget();
    if (!size || !target) {
      return undefined;
    }
    return samplePointer(this.elements.canvas, size, target.projection, clientX, clientY);
  }

  /** Layer output buffer: the viewport projection at the same scale, with a margin. */
  renderTarget(): RenderTarget | undefined {
    return renderTargetFor(this.view, this.size, this.viewport.measure());
  }

  /** Records that a layer's surface was just prepared for the given target. */
  markRendered(layer: MapLayer, target: RenderTarget): void {
    this.presenter.markRendered(layer, target);
  }

  tilePainter(layer: MapLayer): TileReporter | undefined {
    if (!this.displays(layer)) {
      return undefined;
    }
    return (x, y, width, height) => {
      if (this.displays(layer)) {
        this.presenter.tileReady(layer, x, y, width, height);
      }
    };
  }

  reset(): void {
    this.presenter.reset();
    this.masks = new Map();
    this.shape = undefined;
    this.overlayData = {};
    this.overlayInfo = {};
    this.size = undefined;
    this.presented = undefined;
    this.view = fitView();
    this.elements.canvas.width = this.elements.canvas.height = 0;
    this.overlays.reset();
  }

  dispose(): void {
    this.viewport.dispose();
  }

  /** Sizes the surfaces to the measured viewport and repaints the displayed layer. */
  refresh(): void {
    this.applyTargetSize();
    if (this.presented) {
      this.presenter.draw();
      this.presenter.ensure(this.presented);
    }
    this.renderOverlays();
  }

  private renderOverlays(): void {
    this.overlays.render(
      this.masks,
      this.shape,
      this.view,
      this.overlayData,
      this.overlayInfo,
      this.suppressedOverlayIds()
    );
  }

  private suppressedOverlayIds(): ReadonlySet<MapOverlayId> {
    const layer = this.presented?.id;
    const suppressed = new Set<MapOverlayId>();
    if (!layer) {
      return suppressed;
    }
    for (const id of OVERLAY_IDS) {
      if (overlayDescriptor(id).baseLayer === layer) {
        suppressed.add(id);
      }
    }
    return suppressed;
  }

  private overlayAvailable(descriptor: OverlayDescriptor): boolean {
    return descriptor.source !== undefined
      ? this.hasOverlayData(descriptor.source)
      : this.masks.has(descriptor.maskLayer);
  }

  private hasOverlayData(source: string): boolean {
    return this.overlayData[source] !== undefined;
  }

  /** Whether a layer may be drawn now: every stage while walking, one when continuing. */
  private displays(layer: MapLayer): boolean {
    return this.progressive ? this.shouldDisplay(layer.id) : layer.id === this.selectedLayer;
  }

  private setScale(scale: number): boolean {
    const size = this.size;
    return size ? this.applyView(withScale(this.view, this.canvasSize(), size, scale)) : false;
  }

  private applyView(next: ViewTransform): boolean {
    const current = this.view;
    if (
      next.scale === current.scale &&
      next.centerX === current.centerX &&
      next.centerY === current.centerY
    ) {
      return false;
    }
    this.view = next;
    if (this.presented) {
      this.presenter.draw();
      this.presenter.ensure(this.presented);
    }
    this.renderOverlays();
    return true;
  }

  /** Sizes the canvas to the measured viewport, or to the raster before the first measurement. */
  private applyTargetSize(): boolean {
    const { width, height } = presentationSize(this.viewport.measure(), this.size);
    const canvas = this.elements.canvas;
    if (canvas.width === width && canvas.height === height) {
      return false;
    }
    canvas.width = width;
    canvas.height = height;
    return true;
  }

  /** Projection of the presentation canvas for the current view. */
  private viewTarget(): RenderTarget | undefined {
    return viewTargetFor(this.view, this.size, this.viewport.measure());
  }

  private show(layer: MapLayer): void {
    this.applyTargetSize();
    this.presented = layer;
    this.presenter.show(layer);
    this.presenter.ensure(layer);
    this.renderOverlays();
  }

  private canvasSize(): { width: number; height: number } {
    return { width: this.elements.canvas.width, height: this.elements.canvas.height };
  }
}
