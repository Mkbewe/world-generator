import type { WorldShape } from '../../world-shape';
import type { SpatialMask } from '../types';
import type { ViewportSize } from '../viewport';

const MAX_DEVICE_PIXEL_RATIO = 2;
const BOUNDARY_COLOR = 'rgba(100, 255, 218, 0.9)';
const BOUNDARY_LINE_WIDTH = 2;

export class WorldBoundaryRenderer {
  static pixelRatio(devicePixelRatio: number): number {
    return Math.min(MAX_DEVICE_PIXEL_RATIO, Math.max(1, devicePixelRatio));
  }

  constructor(private readonly canvas: HTMLCanvasElement) {}

  clear(): void {
    this.canvas.width = this.canvas.height = 0;
  }

  render(world: SpatialMask, viewport: ViewportSize, shape?: WorldShape): void {
    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Overlay canvas is not available.');
    }
    const ratio = WorldBoundaryRenderer.pixelRatio(viewport.devicePixelRatio);
    const width = Math.max(1, Math.round(viewport.width * ratio));
    const height = Math.max(1, Math.round(viewport.height * ratio));
    this.canvas.width = width;
    this.canvas.height = height;

    if (shape) {
      this.strokeShape(context, shape, width, height, ratio);
      return;
    }
    this.traceCells(world, context, width, height, ratio);
  }

  private strokeShape(
    context: CanvasRenderingContext2D,
    shape: WorldShape,
    width: number,
    height: number,
    ratio: number
  ): void {
    const lineWidth = BOUNDARY_LINE_WIDTH * ratio;
    context.strokeStyle = BOUNDARY_COLOR;
    context.lineWidth = lineWidth;
    context.beginPath();
    if (shape === 'disc') {
      const radius = Math.max(lineWidth / 2, Math.min(width, height) / 2 - lineWidth / 2);
      context.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
    } else {
      context.rect(lineWidth / 2, lineWidth / 2, width - lineWidth, height - lineWidth);
    }
    context.stroke();
  }

  private traceCells(
    world: SpatialMask,
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    ratio: number
  ): void {
    const image = context.createImageData(width, height);
    const radius = Math.max(1, Math.round(ratio));
    const contains = (x: number, y: number): boolean =>
      x >= 0 &&
      x < width &&
      y >= 0 &&
      y < height &&
      world.contains(
        Math.floor((x * world.size.width) / width),
        Math.floor((y * world.size.height) / height)
      );

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
