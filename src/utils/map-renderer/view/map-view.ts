import { OverlayController } from './overlay-controller';
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

/** Owns the preview surfaces and the user's layer selection. */
export class MapView {
  private readonly overlays: OverlayController;
  private readonly viewport: Viewport;
  private mask?: SpatialMask;
  private shape?: WorldShape;
  private size?: MapSize;
  private presented?: MapLayer;
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

  start(size: MapSize, shape?: WorldShape): void {
    this.progressive = true;
    this.shape = shape;
    this.size = size;
    this.viewport.start();
    this.applyTargetSize();
  }

  restoreSelection(fallback?: MapBaseLayerId): void {
    this.progressive = false;
    this.selectedLayer ??= fallback;
  }

  setMasks(masks: ReadonlyMap<MapBaseLayerId, SpatialMask>): void {
    this.mask = masks.get(OVERLAY_LAYERS['world-boundary'].source);
    this.overlays.render(this.mask, this.shape);
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
    this.overlays.render(this.mask, this.shape);
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
      const canvas = this.elements.canvas;
      const scaleX = canvas.width / layer.size.width;
      const scaleY = canvas.height / layer.size.height;
      context.drawImage(
        layer.canvas,
        x,
        y,
        width,
        height,
        x * scaleX,
        y * scaleY,
        width * scaleX,
        height * scaleY
      );
      this.metrics.tileDrawn();
    };
  }

  reset(): void {
    this.mask = undefined;
    this.shape = undefined;
    this.size = undefined;
    this.presented = undefined;
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
    this.overlays.render(this.mask, this.shape);
  }

  private represent(): void {
    const layer = this.presented;
    if (!layer) {
      return;
    }
    this.metrics.present(() => layer.show(this.elements.canvas));
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
    this.metrics.present(() => layer.show(this.elements.canvas));
    this.presented = layer;
  }
}
