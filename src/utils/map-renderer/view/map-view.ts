import { OverlayController } from './overlay-controller';
import type { MapLayer, MapSize, TileReporter } from '../layer';
import type { RenderMetrics } from '../metrics';
import {
  type MapBaseLayerId,
  type MapOverlayId,
  OVERLAY_IDS,
  OVERLAY_LAYERS,
  type SpatialMask,
} from '../types';

export interface MapViewElements {
  canvas: HTMLCanvasElement;
  overlayCanvas: HTMLCanvasElement;
  viewportElement: HTMLElement;
}

/** Owns the preview surfaces and the user's layer selection. */
export class MapView {
  private readonly overlays: OverlayController;
  private mask?: SpatialMask;
  private progressive = true;
  private selectedLayer?: MapBaseLayerId;
  private displayed?: MapBaseLayerId;

  constructor(
    private readonly elements: MapViewElements,
    private readonly metrics: RenderMetrics,
    selectedLayer?: MapBaseLayerId,
    private readonly boundarySource: MapBaseLayerId = OVERLAY_LAYERS['world-boundary'].source
  ) {
    this.selectedLayer = selectedLayer;
    this.overlays = new OverlayController(elements.overlayCanvas, elements.viewportElement, () =>
      this.overlays.render(this.mask)
    );
  }

  get displayedLayer() {
    return this.displayed;
  }
  get viewport() {
    return this.overlays.size();
  }
  get overlayDurationMs() {
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

  start(size: MapSize): void {
    this.progressive = true;
    this.elements.canvas.width = size.width;
    this.elements.canvas.height = size.height;
  }

  restoreSelection(fallback?: MapBaseLayerId): void {
    this.progressive = false;
    this.selectedLayer ??= fallback;
  }

  setMasks(masks: ReadonlyMap<MapBaseLayerId, SpatialMask>): void {
    this.mask = masks.get(this.boundarySource);
    this.overlays.render(this.mask);
  }

  /** Marks a layer as current as soon as its progressive drawing starts. */
  begin(layer: MapLayer): void {
    if (this.progressive) {
      this.displayed = layer.id;
    }
  }

  present(layer: MapLayer): void {
    if (this.progressive || layer.id === this.selectedLayer) {
      this.show(layer);
    }
  }

  select(layer: MapLayer): void {
    this.selectedLayer = layer.id;
    this.show(layer);
  }

  setOverlay(id: MapOverlayId, visible: boolean): void {
    this.overlays.setVisible(id, visible);
    this.overlays.render(this.mask);
  }

  tilePainter(layer: MapLayer): TileReporter | undefined {
    if (!this.progressive) {
      return undefined;
    }
    const context = this.elements.canvas.getContext('2d');
    return (x, y, width, height) => {
      if (!context) {
        return;
      }
      context.drawImage(layer.canvas, x, y, width, height, x, y, width, height);
      this.metrics.tileDrawn();
    };
  }

  reset(): void {
    this.mask = undefined;
    this.displayed = undefined;
    this.elements.canvas.width = this.elements.canvas.height = 0;
    this.overlays.reset();
  }

  dispose(): void {
    this.overlays.dispose();
  }

  private show(layer: MapLayer): void {
    this.metrics.present(() => layer.show(this.elements.canvas));
    this.displayed = layer.id;
  }
}
