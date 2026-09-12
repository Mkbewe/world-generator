import type { MapOverlayId, SpatialMask } from './types';
import { Viewport, type ViewportSize } from './viewport';
import { WorldBoundaryRenderer } from './world-boundary-renderer';

const DEFAULT_VISIBLE: Record<MapOverlayId, boolean> = { 'world-boundary': true };

export class OverlayController {
  private readonly boundary: WorldBoundaryRenderer;
  private readonly viewport: Viewport;
  private visible: Record<MapOverlayId, boolean> = { ...DEFAULT_VISIBLE };
  private rendered?: { world: SpatialMask; viewport: ViewportSize };
  renderDurationMs = 0;

  constructor(
    overlayCanvas: HTMLCanvasElement,
    viewportElement: HTMLElement,
    onViewportChange: () => void
  ) {
    this.boundary = new WorldBoundaryRenderer(overlayCanvas);
    this.viewport = new Viewport(viewportElement, onViewportChange);
    this.viewport.start();
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
      ? {
          ...viewport,
          devicePixelRatio: WorldBoundaryRenderer.pixelRatio(viewport.devicePixelRatio),
        }
      : undefined;
  }

  render(world: SpatialMask | undefined): void {
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
      this.rendered.viewport.width === viewport.width &&
      this.rendered.viewport.height === viewport.height &&
      this.rendered.viewport.devicePixelRatio === viewport.devicePixelRatio
    ) {
      return;
    }

    const startedAt = performance.now();
    this.rendered = undefined;
    try {
      this.boundary.render(world, viewport);
      this.rendered = { world, viewport };
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

  dispose(): void {
    this.viewport.dispose();
  }
}
