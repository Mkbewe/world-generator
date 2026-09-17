import type { WorldShape } from '../../world-shape';
import type { SpatialMask } from '../types';
import { canvasToCell, project, type ViewTransform } from '../view/view-transform';
import { effectivePixelRatio, type ViewportSize } from '../viewport';

const BOUNDARY_COLOR = 'rgba(49, 155, 0, 0.9)';
const BOUNDARY_LINE_WIDTH = 3;

export class WorldBoundaryRenderer {
  constructor(private readonly canvas: HTMLCanvasElement) {}

  clear(): void {
    this.canvas.width = this.canvas.height = 0;
  }

  render(
    world: SpatialMask,
    viewport: ViewportSize,
    shape: WorldShape | undefined,
    view: ViewTransform
  ): void {
    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Overlay canvas is not available.');
    }
    const ratio = effectivePixelRatio(viewport.devicePixelRatio);
    const width = Math.max(1, Math.round(viewport.width * ratio));
    const height = Math.max(1, Math.round(viewport.height * ratio));
    this.canvas.width = width;
    this.canvas.height = height;

    if (shape) {
      this.strokeShape(context, shape, width, height, ratio, view, world);
      return;
    }
    this.traceCells(world, context, width, height, ratio, view);
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

  private traceCells(
    world: SpatialMask,
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    ratio: number,
    view: ViewTransform
  ): void {
    const image = context.createImageData(width, height);
    const radius = Math.max(1, Math.round(ratio));
    const projection = project(view, { width, height }, world.size);
    const contains = (x: number, y: number): boolean => {
      if (x < 0 || x >= width || y < 0 || y >= height) {
        return false;
      }
      const cell = canvasToCell(projection, x, y);
      return world.contains(Math.floor(cell.x), Math.floor(cell.y));
    };

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (
          contains(x, y) &&
          (!contains(x - 1, y) || !contains(x + 1, y) || !contains(x, y - 1) || !contains(x, y + 1))
        ) {
          this.paintDisc(image, x, y, radius);
        }
      }
    }
    context.putImageData(image, 0, 0);
  }

  private paintDisc(image: ImageData, centerX: number, centerY: number, radius: number): void {
    for (let offsetY = -radius; offsetY <= radius; offsetY++) {
      for (let offsetX = -radius; offsetX <= radius; offsetX++) {
        const x = centerX + offsetX;
        const y = centerY + offsetY;
        if (
          offsetX * offsetX + offsetY * offsetY > radius * radius ||
          x < 0 ||
          x >= image.width ||
          y < 0 ||
          y >= image.height
        ) {
          continue;
        }
        const index = (y * image.width + x) * 4;
        image.data[index] = 100;
        image.data[index + 1] = 255;
        image.data[index + 2] = 218;
        image.data[index + 3] = 230;
      }
    }
  }
}
