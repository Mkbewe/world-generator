import type { WorldShapeLayer } from './layer';
import type { MapOverlayId } from './types';
import { Viewport } from './viewport';
import { WorldBoundaryRenderer } from './world-boundary-renderer';

const DEFAULT_VISIBLE: Record<MapOverlayId, boolean> = { 'world-boundary': true };

export class OverlayController {
  private readonly boundary: WorldBoundaryRenderer;
  private readonly viewport: Viewport;
  private visible: Record<MapOverlayId, boolean> = { ...DEFAULT_VISIBLE };

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

  render(world: WorldShapeLayer | undefined): void {
    const viewport = this.viewport.measure();
    try {
      if (viewport && world && this.visible['world-boundary']) {
        this.boundary.render(world, viewport);
      } else {
        this.boundary.clear();
      }
    } catch {
      // The boundary is a best-effort overlay; base layer errors are reported elsewhere.
    }
  }

  reset(): void {
    this.visible = { ...DEFAULT_VISIBLE };
    this.boundary.clear();
  }

  dispose(): void {
    this.viewport.dispose();
  }
}
