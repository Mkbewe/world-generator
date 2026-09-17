import type { WorldShape } from '../../world-shape';
import type { MapOverlayId, SpatialMask } from '../types';
import { effectivePixelRatio, type Viewport, type ViewportSize } from '../viewport';
import { WorldBoundaryRenderer } from '../world-boundary-renderer';

const DEFAULT_VISIBLE: Record<MapOverlayId, boolean> = { 'world-boundary': true };

export class OverlayController {
  private readonly boundary: WorldBoundaryRenderer;
  private visible: Record<MapOverlayId, boolean> = { ...DEFAULT_VISIBLE };
  private rendered?: { world: SpatialMask; viewport: ViewportSize; shape?: WorldShape };
  renderDurationMs = 0;

  constructor(
    overlayCanvas: HTMLCanvasElement,
    private readonly viewport: Viewport
  ) {
    this.boundary = new WorldBoundaryRenderer(overlayCanvas);
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

  render(world: SpatialMask | undefined, shape?: WorldShape): void {
    const viewport = this.size();
    if (!viewport || !world || !this.visible['world-boundary']) {
      if (this.rendered) {
        const startedAt = performance.now();
        this.boundary.clear();
        this.rendered = undefined;
        this.renderDurationMs += performance.now() - startedAt;
      }
      return;
    }
    if (
      this.rendered?.world === world &&
      this.rendered.shape === shape &&
      this.rendered.viewport.width === viewport.width &&
      this.rendered.viewport.height === viewport.height &&
      this.rendered.viewport.devicePixelRatio === viewport.devicePixelRatio
    ) {
      return;
    }

    const startedAt = performance.now();
    this.rendered = undefined;
    try {
      this.boundary.render(world, viewport, shape);
      this.rendered = { world, viewport, shape };
    } catch {
      // The boundary is a best-effort overlay; base layer errors are reported elsewhere.
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
}
