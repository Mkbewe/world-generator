import type { OverlayFrame, OverlayRenderer } from './overlay-renderer';
import { sampleOceanCurrentArrows, traceOceanCurrentArrows } from '../../ocean-current';
import { projectWithPadding } from '../../preview-targets';
import { effectivePixelRatio } from '../../viewport';
import { traceWorldBoundary } from '../../world-boundary-renderer';

/** Light halo under a dark core keeps arrows readable on every layer. */
const HALO_COLOR = 'rgba(255, 255, 255, 0.75)';
const HALO_WIDTH = 3;
const CURRENT_COLOR = 'rgba(16, 46, 92, 0.9)';
const CURRENT_WIDTH = 1.5;

/** Paints the static BaseClimate currents as direction arrows. */
export class OceanCurrentOverlayRenderer implements OverlayRenderer {
  readonly id = 'ocean-currents' as const;

  isAvailable(frame: OverlayFrame): boolean {
    const cells = frame.world.size.width * frame.world.size.height;
    const map = frame.data.oceanCurrentMap;
    const strength = frame.data.oceanCurrentStrength;
    return (
      map instanceof Float32Array &&
      map.length === cells &&
      strength instanceof Float32Array &&
      strength.length === cells
    );
  }

  render(frame: OverlayFrame): void {
    const map = frame.data.oceanCurrentMap;
    const strength = frame.data.oceanCurrentStrength;
    if (!(map instanceof Float32Array) || !(strength instanceof Float32Array)) {
      return;
    }
    const context = frame.canvas.getContext('2d');
    if (!context) {
      throw new Error('Overlay canvas is not available.');
    }
    const ratio = effectivePixelRatio(frame.viewport.devicePixelRatio);
    const projection = projectWithPadding(
      frame.view,
      frame.world.size,
      { width: frame.canvas.width, height: frame.canvas.height },
      frame.viewport.devicePixelRatio
    );
    const arrows = sampleOceanCurrentArrows(frame.world, map, strength, projection, ratio);
    if (arrows.length === 0) {
      return;
    }

    context.save();
    context.beginPath();
    traceWorldBoundary(context, projection, frame.world.size, frame.shape);
    context.clip();
    context.beginPath();
    traceOceanCurrentArrows(context, arrows, ratio);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = HALO_COLOR;
    context.lineWidth = HALO_WIDTH * ratio;
    context.stroke();
    context.strokeStyle = CURRENT_COLOR;
    context.lineWidth = CURRENT_WIDTH * ratio;
    context.stroke();
    context.restore();
  }
}
