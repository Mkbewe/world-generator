import { HeatZoneOverlayRenderer } from './heat-zone-overlay-renderer';
import type { OverlayFrame, OverlayRenderer } from './overlay-renderer';
import { WorldBoundaryOverlayRenderer } from './world-boundary-overlay-renderer';
import type { LayerDataRecord } from '../../../map-layers';
import type { WorldShape } from '../../../world-shape';
import type { MapInfo, MapOverlayId, SpatialMask } from '../../types';
import { effectivePixelRatio, type Viewport, type ViewportSize } from '../../viewport';
import { WorldBoundaryRenderer } from '../../world-boundary-renderer';
import type { ViewTransform } from '../view-transform';

const DEFAULT_VISIBLE: Record<MapOverlayId, boolean> = {
  'world-boundary': true,
  'heat-zones': true,
};

const EMPTY_INFO: MapInfo = {};

/** Composites the visible overlays in painter order: heat zones, then the outline. */
export class OverlayController {
  private readonly boundary: WorldBoundaryRenderer;
  private readonly renderers: readonly OverlayRenderer[];
  private visible: Record<MapOverlayId, boolean> = { ...DEFAULT_VISIBLE };
  private rendered?: {
    world: SpatialMask;
    viewport: ViewportSize;
    shape: WorldShape;
    view: ViewTransform;
    heatMap?: Int16Array;
    info: MapInfo;
    activeIds: readonly MapOverlayId[];
  };
  renderDurationMs = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly viewport: Viewport
  ) {
    this.boundary = new WorldBoundaryRenderer(canvas);
    this.renderers = [
      new HeatZoneOverlayRenderer(),
      new WorldBoundaryOverlayRenderer(this.boundary),
    ];
  }

  isVisible(id: MapOverlayId): boolean {
    return this.visible[id];
  }

  setVisible(id: MapOverlayId, visible: boolean): void {
    this.visible[id] = visible;
  }

  size(): ViewportSize | undefined {
    const viewport = this.viewport.measure();
    return viewport
      ? { ...viewport, devicePixelRatio: effectivePixelRatio(viewport.devicePixelRatio) }
      : undefined;
  }

  render(
    world: SpatialMask | undefined,
    shape: WorldShape | undefined,
    view: ViewTransform,
    data: LayerDataRecord = {},
    info: MapInfo = EMPTY_INFO
  ): void {
    const viewport = this.size();
    if (!viewport || !world || !shape) {
      this.clear();
      return;
    }
    const frame: OverlayFrame = { canvas: this.canvas, world, shape, viewport, view, data, info };
    const active = this.renderers.filter(
      renderer => this.visible[renderer.id] && renderer.isAvailable(frame)
    );
    if (active.length === 0) {
      this.clear();
      return;
    }
    const heatMap = heatZoneMapOf(data);
    if (this.isUnchanged(frame, active, heatMap)) {
      return;
    }

    const startedAt = performance.now();
    this.rendered = undefined;
    try {
      this.prepare(viewport);
      for (const renderer of active) {
        renderer.render(frame);
      }
      this.rendered = {
        world,
        viewport,
        shape,
        view,
        heatMap,
        info,
        activeIds: active.map(renderer => renderer.id),
      };
    } catch {
      // Overlays are best-effort; base layer errors are reported elsewhere.
      this.boundary.clear();
    } finally {
      this.renderDurationMs += performance.now() - startedAt;
    }
  }

  reset(): void {
    this.rendered = undefined;
    this.renderDurationMs = 0;
    this.visible = { ...DEFAULT_VISIBLE };
    this.boundary.clear();
  }

  private isUnchanged(
    frame: OverlayFrame,
    active: readonly OverlayRenderer[],
    heatMap: Int16Array | undefined
  ): boolean {
    const rendered = this.rendered;
    return (
      rendered?.world === frame.world &&
      rendered.shape === frame.shape &&
      rendered.view.scale === frame.view.scale &&
      rendered.view.centerX === frame.view.centerX &&
      rendered.view.centerY === frame.view.centerY &&
      rendered.viewport.width === frame.viewport.width &&
      rendered.viewport.height === frame.viewport.height &&
      rendered.viewport.devicePixelRatio === frame.viewport.devicePixelRatio &&
      rendered.heatMap === heatMap &&
      rendered.info === frame.info &&
      rendered.activeIds.length === active.length &&
      active.every((renderer, index) => rendered.activeIds[index] === renderer.id)
    );
  }

  private clear(): void {
    if (!this.rendered) {
      return;
    }
    const startedAt = performance.now();
    this.boundary.clear();
    this.rendered = undefined;
    this.renderDurationMs += performance.now() - startedAt;
  }

  private prepare(viewport: ViewportSize): void {
    const ratio = effectivePixelRatio(viewport.devicePixelRatio);
    this.canvas.width = Math.max(1, Math.round(viewport.width * ratio));
    this.canvas.height = Math.max(1, Math.round(viewport.height * ratio));
    this.canvas.getContext('2d')?.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

function heatZoneMapOf(data: LayerDataRecord): Int16Array | undefined {
  const value = data.heatZoneMap;
  return value instanceof Int16Array ? value : undefined;
}
