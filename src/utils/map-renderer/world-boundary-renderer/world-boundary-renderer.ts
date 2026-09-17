import type { WorldShape } from '../../world-shape';
import type { SpatialMask } from '../types';
import { project, type ViewTransform } from '../view/view-transform';
import { effectivePixelRatio, type ViewportSize } from '../viewport';

const BOUNDARY_COLOR = 'rgba(49, 155, 0, 0.9)';
const BOUNDARY_LINE_WIDTH = 3;

export class WorldBoundaryRenderer {
  constructor(private readonly canvas: HTMLCanvasElement) {}

  clear(): void {
    this.canvas.width = this.canvas.height = 0;
  }

  render(world: SpatialMask, viewport: ViewportSize, shape: WorldShape, view: ViewTransform): void {
    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Overlay canvas is not available.');
    }
    const ratio = effectivePixelRatio(viewport.devicePixelRatio);
    const width = Math.max(1, Math.round(viewport.width * ratio));
    const height = Math.max(1, Math.round(viewport.height * ratio));
    this.canvas.width = width;
    this.canvas.height = height;
    this.strokeShape(context, shape, width, height, ratio, view, world);
  }

  private strokeShape(
    context: CanvasRenderingContext2D,
    shape: WorldShape,
    width: number,
    height: number,
    ratio: number,
    view: ViewTransform,
    world: SpatialMask
  ): void {
    const lineWidth = BOUNDARY_LINE_WIDTH * ratio;
    const projection = project(view, { width, height }, world.size);

    context.strokeStyle = BOUNDARY_COLOR;
    context.lineWidth = lineWidth;
    context.beginPath();
    if (shape === 'disc') {
      const radius = Math.max(
        lineWidth / 2,
        Math.min(projection.width, projection.height) / 2 - lineWidth / 2
      );
      context.arc(
        projection.left + projection.width / 2,
        projection.top + projection.height / 2,
        radius,
        0,
        Math.PI * 2
      );
    } else {
      context.rect(
        projection.left + lineWidth / 2,
        projection.top + lineWidth / 2,
        projection.width - lineWidth,
        projection.height - lineWidth
      );
    }
    context.stroke();
  }
}
