import { HeatZoneOverlayRenderer } from './heat-zone-overlay-renderer';
import { MoistureOverlayRenderer } from './moisture-overlay-renderer';
import { OceanCurrentOverlayRenderer } from './ocean-current-overlay-renderer';
import type { OverlayFrame, OverlayRenderer } from './overlay-renderer';
import { WorldBoundaryOverlayRenderer } from './world-boundary-overlay-renderer';
import type { LayerDataRecord } from '../../../map-layers';
import type { WorldShape } from '../../../world-shape';
import {
  DEFAULT_OVERLAY_VISIBILITY,
  type MapInfo,
  type MapOverlayId,
  type SpatialMask,
} from '../../types';
import { effectivePixelRatio, type Viewport, type ViewportSize } from '../../viewport';
import { WorldBoundaryRenderer } from '../../world-boundary-renderer';
import type { ViewTransform } from '../view-transform';

const EMPTY_INFO: MapInfo = {};
const EMPTY_SUPPRESSED: ReadonlySet<MapOverlayId> = new Set();

/** Composites the visible overlays in painter order: fields, then the outline. */
export class OverlayController {
  private readonly boundary: WorldBoundaryRenderer;
  private readonly renderers: readonly OverlayRenderer[];
  private visible: Record<MapOverlayId, boolean> = { ...DEFAULT_OVERLAY_VISIBILITY };
  private rendered?: {
    world: SpatialMask;
    viewport: ViewportSize;
    shape: WorldShape;
    view: ViewTransform;
    heatMap?: Int16Array;
    moistureMap?: Float32Array;
    currentMap?: Float32Array;
    currentStrength?: Float32Array;
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
      new MoistureOverlayRenderer(),
      new OceanCurrentOverlayRenderer(),
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
    info: MapInfo = EMPTY_INFO,
    suppressed: ReadonlySet<MapOverlayId> = EMPTY_SUPPRESSED
  ): void {
    const viewport = this.size();
    if (!viewport || !world || !shape) {
      this.clear();
      return;
    }
    const frame: OverlayFrame = { canvas: this.canvas, world, shape, viewport, view, data, info };
    const active = this.renderers.filter(
      renderer =>
        this.visible[renderer.id] && !suppressed.has(renderer.id) && renderer.isAvailable(frame)
    );
    if (active.length === 0) {
      this.clear();
      return;
    }
    const heatMap = heatZoneMapOf(data);
    const moistureMap = moistureMapOf(data);
    const currentMap = float32MapOf(data, 'oceanCurrentMap');
    const currentStrength = float32MapOf(data, 'oceanCurrentStrength');
    if (this.isUnchanged(frame, active, heatMap, moistureMap, currentMap, currentStrength)) {
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
        moistureMap,
        currentMap,
        currentStrength,
        info,
        activeIds: active.map(renderer => renderer.id),
      };
    } catch (error) {
      // Overlays are best-effort; base layer errors are reported elsewhere.
      console.error('Overlay rendering failed.', error);
      this.boundary.clear();
    } finally {
      this.renderDurationMs += performance.now() - startedAt;
    }
  }

  reset(): void {
    this.rendered = undefined;
    this.renderDurationMs = 0;
    this.visible = { ...DEFAULT_OVERLAY_VISIBILITY };
    this.boundary.clear();
  }

  private isUnchanged(
    frame: OverlayFrame,
    active: readonly OverlayRenderer[],
    heatMap: Int16Array | undefined,
    moistureMap: Float32Array | undefined,
    currentMap: Float32Array | undefined,
    currentStrength: Float32Array | undefined
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
      rendered.moistureMap === moistureMap &&
      rendered.currentMap === currentMap &&
      rendered.currentStrength === currentStrength &&
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

function moistureMapOf(data: LayerDataRecord): Float32Array | undefined {
  return float32MapOf(data, 'moistureBaseMap');
}

function float32MapOf(data: LayerDataRecord, key: string): Float32Array | undefined {
  const value = data[key];
  return value instanceof Float32Array ? value : undefined;
}
