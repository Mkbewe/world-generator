import { OverlayController } from './overlay-controller';
import {
  fitView,
  isFitted,
  nextZoomScale,
  panBy,
  previousZoomScale,
  type ViewTransform,
  withScale,
  zoomAt,
} from './view-transform';
import type { WorldShape } from '../../world-shape';
import type { MapLayer, MapSize, TileReporter } from '../layer';
import { LayerPresenter } from '../layer-presenter';
import type { RenderMetrics } from '../metrics';
import { type MapPointerSample, pointerAnchor, samplePointer } from '../pointer-sampling';
import {
  presentationSize,
  type RenderTarget,
  renderTarget as renderTargetFor,
  viewTarget as viewTargetFor,
} from '../preview-targets';
import {
  type MapBaseLayerId,
  type MapOverlayId,
  OVERLAY_IDS,
  OVERLAY_LAYERS,
  type SpatialMask,
} from '../types';
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
  private mask?: SpatialMask;
  private shape?: WorldShape;
  private size?: MapSize;
  private presented?: MapLayer;
  private view: ViewTransform = fitView();
  private progressive = true;
  private selectedLayer?: MapBaseLayerId;

  constructor(
    private readonly elements: MapViewElements,
    metrics: RenderMetrics,
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
      () => this.viewTarget()
    );
  }

  get displayedLayer(): MapBaseLayerId | undefined {
    return this.presented?.id;
  }

  get viewportSize(): ViewportSize | undefined {
    return this.overlays.size();
  }

  get viewTransform(): ViewTransform {
    return this.view;
  }

  get zoomed(): boolean {
    return !isFitted(this.view);
  }

  get overlayDurationMs(): number {
    return this.overlays.renderDurationMs;
  }

  /** Completes when the displayed layer has caught up with the current view. */
  get ready(): Promise<void> {
    return this.presenter.ready;
  }

  get overlayOptions() {
    return OVERLAY_IDS.map(id => ({
      id,
      label: OVERLAY_LAYERS[id].label,
      available: this.mask !== undefined,
      visible: this.overlays.isVisible(id),
    }));
  }

  start(size: MapSize, shape: WorldShape): void {
    this.progressive = true;
    this.shape = shape;
    this.presenter.setShape(shape);
    this.size = size;
    this.view = fitView();
    this.viewport.start();
    this.applyTargetSize();
  }

  restoreSelection(fallback?: MapBaseLayerId): void {
    this.progressive = false;
    this.selectedLayer ??= fallback;
  }

  setMasks(masks: ReadonlyMap<MapBaseLayerId, SpatialMask>): void {
    this.mask = masks.get(OVERLAY_LAYERS['world-boundary'].source);
    this.overlays.render(this.mask, this.shape, this.view);
  }

  /** Marks a layer as current as soon as its progressive drawing starts. */
  begin(layer: MapLayer): void {
    if (this.progressive && this.shouldDisplay(layer.id)) {
      this.presented = layer;
      this.presenter.show(layer);
    }
  }

  present(layer: MapLayer): void {
    if (this.progressive ? this.shouldDisplay(layer.id) : layer.id === this.selectedLayer) {
      this.show(layer);
    }
  }

  select(layer: MapLayer): void {
    this.selectedLayer = layer.id;
    this.show(layer);
  }

  setOverlay(id: MapOverlayId, visible: boolean): void {
    this.overlays.setVisible(id, visible);
    this.overlays.render(this.mask, this.shape, this.view);
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
    if (!size) {
      return undefined;
    }
    return samplePointer(this.elements.canvas, size, this.view, clientX, clientY);
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
    if (!this.progressive || !this.shouldDisplay(layer.id)) {
      return undefined;
    }
    return (x, y, width, height) => {
      if (this.shouldDisplay(layer.id)) {
        this.presenter.tileReady(layer, x, y, width, height);
      }
    };
  }

  reset(): void {
    this.presenter.reset();
    this.mask = undefined;
    this.shape = undefined;
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
    this.overlays.render(this.mask, this.shape, this.view);
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
    this.overlays.render(this.mask, this.shape, this.view);
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
  }

  private canvasSize(): { width: number; height: number } {
    return { width: this.elements.canvas.width, height: this.elements.canvas.height };
  }
}
