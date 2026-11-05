import type { OverlayFrame, OverlayRenderer } from './overlay-renderer';
import type { WorldBoundaryRenderer } from '../../world-boundary-renderer';

/** Draws the world outline above the other overlays. */
export class WorldBoundaryOverlayRenderer implements OverlayRenderer {
  readonly id = 'world-boundary' as const;

  constructor(private readonly boundary: WorldBoundaryRenderer) {}

  isAvailable(): boolean {
    return true;
  }

  render(frame: OverlayFrame): void {
    this.boundary.stroke(frame.world, frame.viewport, frame.shape, frame.view);
  }
}
