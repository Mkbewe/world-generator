import type { WorldShapeLayer } from '../layer';
import type { ViewportSize } from '../viewport';

const MAX_DEVICE_PIXEL_RATIO = 2;

export class WorldBoundaryRenderer {
  constructor(private readonly canvas: HTMLCanvasElement) {}

  clear(): void {
    this.canvas.width = this.canvas.height = 0;
  }

  render(world: WorldShapeLayer, viewport: ViewportSize): void {
    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Overlay canvas is not available.');
    }
    const ratio = Math.min(MAX_DEVICE_PIXEL_RATIO, Math.max(1, viewport.devicePixelRatio));
    const width = Math.max(1, Math.round(viewport.width * ratio));
    const height = Math.max(1, Math.round(viewport.height * ratio));
    this.canvas.width = width;
    this.canvas.height = height;
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
