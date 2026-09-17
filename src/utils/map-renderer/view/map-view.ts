import { OverlayController } from './overlay-controller';
import {
  type CanvasSize,
  canvasToCell,
  cellToCanvas,
  fitView,
  isFitted,
  nextZoomScale,
  panBy,
  previousZoomScale,
  project,
  type ViewTransform,
  withScale,
  zoomAt,
} from './view-transform';
import type { WorldShape } from '../../world-shape';
import type { MapLayer, MapSize, TileReporter } from '../layer';
import type { RenderMetrics } from '../metrics';
import {
  type MapBaseLayerId,
  type MapOverlayId,
  OVERLAY_IDS,
  OVERLAY_LAYERS,
  type SpatialMask,
} from '../types';
import { effectivePixelRatio, Viewport, type ViewportSize } from '../viewport';

export interface MapViewElements {
  canvas: HTMLCanvasElement;
  overlayCanvas: HTMLCanvasElement;
  viewportElement: HTMLElement;
}

/** Cell and map coordinates of a pointer position. */
export interface MapPointerSample {
  readonly x: number;
  readonly y: number;
  readonly u: number;
  readonly v: number;
}

/** Owns the preview surfaces, the view transform and the user's layer selection. */
export class MapView {
  private readonly overlays: OverlayController;
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
    private readonly metrics: RenderMetrics,
    selectedLayer?: MapBaseLayerId,
    private readonly shouldDisplay: (id: MapBaseLayerId) => boolean = () => true
  ) {
    this.selectedLayer = selectedLayer;
    this.viewport = new Viewport(elements.viewportElement, () => this.refresh());
    this.overlays = new OverlayController(elements.overlayCanvas, this.viewport);
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
    const anchor = this.pointerAnchor(clientX, clientY);
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
    const anchor = this.pointerAnchor(clientX, clientY);
    if (!size || !anchor) {
      return undefined;
    }
    const cell = canvasToCell(project(this.view, this.canvasSize(), size), anchor.x, anchor.y);
    if (cell.x < 0 || cell.x >= size.width || cell.y < 0 || cell.y >= size.height) {
      return undefined;
    }
    return {
      x: Math.floor(cell.x),
      y: Math.floor(cell.y),
      u: cell.x / size.width,
      v: cell.y / size.height,
    };
  }

  tilePainter(layer: MapLayer): TileReporter | undefined {
    if (!this.progressive || !this.shouldDisplay(layer.id)) {
      return undefined;
    }
    const context = this.elements.canvas.getContext('2d');
    return (x, y, width, height) => {
      if (!context || !this.shouldDisplay(layer.id)) {
        return;
      }
      const projection = project(this.view, this.canvasSize(), layer.size);
      const origin = cellToCanvas(projection, x, y);
      context.drawImage(
        layer.canvas,
        x,
        y,
        width,
        height,
        origin.x,
        origin.y,
        width * projection.cellSize,
        height * projection.cellSize
      );
      this.metrics.tileDrawn();
    };
  }

  reset(): void {
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
    if (this.applyTargetSize() && this.presented) {
      this.represent();
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
      this.represent();
    }
    this.overlays.render(this.mask, this.shape, this.view);
    return true;
  }

  private represent(): void {
    const layer = this.presented;
    if (!layer) {
      return;
    }
    this.metrics.present(() => layer.show(this.elements.canvas, this.view));
  }

  /** Sizes the canvas to the measured viewport, or to the raster before the first measurement. */
  private applyTargetSize(): boolean {
    const target = this.viewport.measure();
    const ratio = target ? effectivePixelRatio(target.devicePixelRatio) : 1;
    const width = target ? Math.max(1, Math.round(target.width * ratio)) : (this.size?.width ?? 0);
    const height = target
      ? Math.max(1, Math.round(target.height * ratio))
      : (this.size?.height ?? 0);
    const canvas = this.elements.canvas;
    if (canvas.width === width && canvas.height === height) {
      return false;
    }
    canvas.width = width;
    canvas.height = height;
    return true;
  }

  private show(layer: MapLayer): void {
    this.applyTargetSize();
    this.metrics.present(() => layer.show(this.elements.canvas, this.view));
    this.presented = layer;
  }

  /** Canvas point in device pixels of a client position. */
  private pointerAnchor(clientX: number, clientY: number): { x: number; y: number } | undefined {
    const canvas = this.elements.canvas;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return undefined;
    }
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  private canvasSize(): CanvasSize {
    return { width: this.elements.canvas.width, height: this.elements.canvas.height };
  }
}
