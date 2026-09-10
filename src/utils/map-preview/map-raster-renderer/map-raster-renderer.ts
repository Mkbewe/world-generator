import type { MapBaseLayerId, PreviewMapLayers } from '../types';

const SHAPE_COLOR = [16, 42, 67] as const;
const ROWS_PER_CHUNK = 128;

export class MapRasterRenderer {
  async render(
    canvas: HTMLCanvasElement,
    layers: PreviewMapLayers,
    baseLayer: MapBaseLayerId,
    isCancelled: () => boolean = () => false
  ): Promise<boolean> {
    const context = canvas.getContext('2d');
    if (!context || (!layers.worldMask && !layers.noiseMap)) {
      return false;
    }

    const imageData = context.createImageData(canvas.width, canvas.height);
    const { width, height } = canvas;

    for (let y = 0; y < height; y++) {
      if (y > 0 && y % ROWS_PER_CHUNK === 0) {
        await this.yieldToBrowser();
        if (isCancelled()) {
          return false;
        }
      }

      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        const index = rowOffset + x;
        if (layers.worldMask?.[index] !== 1) {
          continue;
        }

        const color = this.getBaseColor(baseLayer, index, layers.noiseMap);
        if (color) {
          this.setPixel(imageData.data, index * 4, color, 255);
        }
      }
    }

    context.putImageData(imageData, 0, 0);
    return true;
  }

  private yieldToBrowser(): Promise<void> {
    return new Promise(resolve => globalThis.setTimeout(resolve, 0));
  }

  private getBaseColor(
    baseLayer: MapBaseLayerId,
    index: number,
    noiseMap: Float32Array | undefined
  ): readonly [number, number, number] | undefined {
    if (baseLayer === 'world-shape') {
      return SHAPE_COLOR;
    }
    if (!noiseMap) {
      return undefined;
    }

    const value = Math.round(noiseMap[index] * 255);
    return [value, value, value];
  }

  private setPixel(
    data: Uint8ClampedArray,
    index: number,
    color: readonly [number, number, number],
    alpha: number
  ): void {
    data[index] = color[0];
    data[index + 1] = color[1];
    data[index + 2] = color[2];
    data[index + 3] = alpha;
  }
}
