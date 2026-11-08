import { OVERLAY_COMPONENTS } from './overlay-components';
import type { OverlayFrame, OverlayRenderer } from './overlay-renderer';
import { type LayerDataRecord, type MapBaseLayerId, overlayDescriptor } from '../../../map-layers';
import type { WorldShape } from '../../../world-shape';
import type { MapInfo, MapOverlayId, SpatialMask } from '../../types';
import { effectivePixelRatio, type Viewport, type ViewportSize } from '../../viewport';
import { WorldBoundaryRenderer } from '../../world-boundary-renderer';
import type { ViewTransform } from '../view-transform';

const EMPTY_SUPPRESSED: ReadonlySet<MapOverlayId> = new Set();
const EMPTY_DATA: LayerDataRecord = {};
const EMPTY_INFO: MapInfo = {};

interface ActiveOverlay {
  readonly renderer: OverlayRenderer;
  readonly frame: OverlayFrame;
}

/** Composites the visible overlays in painter order: fields, then the outline. */
export class OverlayController {
  private readonly boundary: WorldBoundaryRenderer;
  private readonly renderers: readonly OverlayRenderer[];
  private visible: Record<string, boolean> = {};
  private rendered?: {
    worlds: readonly SpatialMask[];
    viewport: ViewportSize;
    shape: WorldShape;
    view: ViewTransform;
    data: LayerDataRecord;
    info: MapInfo;
    activeIds: readonly MapOverlayId[];
  };
  renderDurationMs = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly viewport: Viewport
  ) {
    this.boundary = new WorldBoundaryRenderer(canvas);
    this.renderers = OVERLAY_COMPONENTS.map(component => component.createRenderer(canvas));
  }

  isVisible(id: MapOverlayId): boolean {
    return this.visible[id] ?? overlayDescriptor(id).defaultVisible;
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
    masks: ReadonlyMap<MapBaseLayerId, SpatialMask>,
    shape: WorldShape | undefined,
    view: ViewTransform,
    data: LayerDataRecord = EMPTY_DATA,
    info: MapInfo = EMPTY_INFO,
    suppressed: ReadonlySet<MapOverlayId> = EMPTY_SUPPRESSED
  ): void {
    const viewport = this.size();
    if (!viewport || !shape) {
      this.clear();
      return;
    }
    const active = this.activeOverlays(masks, shape, viewport, view, data, info, suppressed);
    if (active.length === 0) {
      this.clear();
      return;
    }
    if (this.isUnchanged(viewport, shape, view, data, info, active)) {
      return;
    }

    const startedAt = performance.now();
    this.rendered = undefined;
    try {
      this.prepare(viewport);
      for (const { renderer, frame } of active) {
        renderer.render(frame);
      }
      this.rendered = {
        worlds: active.map(({ frame }) => frame.world),
        viewport,
        shape,
        view,
        data,
        info,
        activeIds: active.map(({ renderer }) => renderer.id),
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
    this.visible = {};
    this.boundary.clear();
  }

  private activeOverlays(
    masks: ReadonlyMap<MapBaseLayerId, SpatialMask>,
    shape: WorldShape,
    viewport: ViewportSize,
    view: ViewTransform,
    data: LayerDataRecord,
    info: MapInfo,
    suppressed: ReadonlySet<MapOverlayId>
  ): readonly ActiveOverlay[] {
    const active: ActiveOverlay[] = [];
    for (const renderer of this.renderers) {
      if (!this.isVisible(renderer.id) || suppressed.has(renderer.id)) {
        continue;
      }
      const mask = masks.get(overlayDescriptor(renderer.id).maskLayer);
      if (!mask) {
        continue;
      }
      const frame: OverlayFrame = {
        canvas: this.canvas,
        world: mask,
        shape,
        viewport,
        view,
        data,
        info,
      };
      if (renderer.isAvailable(frame)) {
        active.push({ renderer, frame });
      }
    }
    return active;
  }

  private isUnchanged(
    viewport: ViewportSize,
    shape: WorldShape,
    view: ViewTransform,
    data: LayerDataRecord,
    info: MapInfo,
    active: readonly ActiveOverlay[]
  ): boolean {
    const rendered = this.rendered;
    return (
      rendered !== undefined &&
      rendered.shape === shape &&
      rendered.view.scale === view.scale &&
      rendered.view.centerX === view.centerX &&
      rendered.view.centerY === view.centerY &&
      rendered.viewport.width === viewport.width &&
      rendered.viewport.height === viewport.height &&
      rendered.viewport.devicePixelRatio === viewport.devicePixelRatio &&
      sameRecord(rendered.data, data) &&
      rendered.info === info &&
      rendered.activeIds.length === active.length &&
      active.every(
        ({ renderer, frame }, index) =>
          rendered.activeIds[index] === renderer.id && rendered.worlds[index] === frame.world
      )
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

/** Shallow reference comparison: overlay data is a flat record of rasters. */
function sameRecord(left: LayerDataRecord, right: LayerDataRecord): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return leftKeys.length === rightKeys.length && leftKeys.every(key => left[key] === right[key]);
}
