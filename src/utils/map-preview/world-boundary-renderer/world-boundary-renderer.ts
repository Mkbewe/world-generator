const BOUNDARY_COLOR = [100, 255, 218] as const;
const BOUNDARY_WIDTH_CSS_PX = 2;
const MAX_DEVICE_PIXEL_RATIO = 2;

interface BoundaryRenderOptions {
  canvas: HTMLCanvasElement;
  worldMask?: Uint8Array;
  sourceWidth: number;
  sourceHeight: number;
  displayWidth: number;
  displayHeight: number;
  devicePixelRatio: number;
}

export class WorldBoundaryRenderer {
  render(options: BoundaryRenderOptions): boolean {
    const { canvas, worldMask, sourceWidth, sourceHeight, displayWidth, displayHeight } = options;
    const context = canvas.getContext('2d');
    if (!context) {
      return false;
    }

    const pixelRatio = Math.min(MAX_DEVICE_PIXEL_RATIO, Math.max(1, options.devicePixelRatio));
    const width = Math.max(1, Math.round(displayWidth * pixelRatio));
    const height = Math.max(1, Math.round(displayHeight * pixelRatio));

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    context.clearRect(0, 0, width, height);
    if (!worldMask || sourceWidth <= 0 || sourceHeight <= 0) {
      return true;
    }

    const imageData = context.createImageData(width, height);
    const radius = Math.max(1, Math.round((BOUNDARY_WIDTH_CSS_PX * pixelRatio) / 2));

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (this.isBoundary(worldMask, x, y, width, height, sourceWidth, sourceHeight)) {
          this.paintDisc(imageData.data, x, y, width, height, radius);
        }
      }
    }

    context.putImageData(imageData, 0, 0);
    return true;
  }

  private isBoundary(
    mask: Uint8Array,
    x: number,
    y: number,
    width: number,
    height: number,
    sourceWidth: number,
    sourceHeight: number
  ): boolean {
    if (!this.sample(mask, x, y, width, height, sourceWidth, sourceHeight)) {
      return false;
    }

    return (
      x === 0 ||
      x === width - 1 ||
      y === 0 ||
      y === height - 1 ||
      !this.sample(mask, x - 1, y, width, height, sourceWidth, sourceHeight) ||
      !this.sample(mask, x + 1, y, width, height, sourceWidth, sourceHeight) ||
      !this.sample(mask, x, y - 1, width, height, sourceWidth, sourceHeight) ||
      !this.sample(mask, x, y + 1, width, height, sourceWidth, sourceHeight)
    );
  }

  private sample(
    mask: Uint8Array,
    x: number,
    y: number,
    width: number,
    height: number,
    sourceWidth: number,
    sourceHeight: number
  ): boolean {
    if (x < 0 || x >= width || y < 0 || y >= height) {
      return false;
    }

    const sourceX = Math.min(sourceWidth - 1, Math.floor((x / width) * sourceWidth));
    const sourceY = Math.min(sourceHeight - 1, Math.floor((y / height) * sourceHeight));
    return mask[sourceY * sourceWidth + sourceX] === 1;
  }

  private paintDisc(
    data: Uint8ClampedArray,
    centerX: number,
    centerY: number,
    width: number,
    height: number,
    radius: number
  ): void {
    for (let offsetY = -radius; offsetY <= radius; offsetY++) {
      for (let offsetX = -radius; offsetX <= radius; offsetX++) {
        if (offsetX * offsetX + offsetY * offsetY > radius * radius) {
          continue;
        }

        const x = centerX + offsetX;
        const y = centerY + offsetY;
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const index = (y * width + x) * 4;
          data[index] = BOUNDARY_COLOR[0];
          data[index + 1] = BOUNDARY_COLOR[1];
          data[index + 2] = BOUNDARY_COLOR[2];
          data[index + 3] = 230;
        }
      }
    }
  }
}
