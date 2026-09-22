import type { LayerTile, MapSize } from './layer';
import type { SmoothGeometry } from './smooth-geometry';
import type { PixelWriter, RasterData } from '../../map-layers';
import { containsWorld } from '../../world-shape';
import type { RenderTarget } from '../preview-targets';
import type { SpatialMask } from '../types';

const SAMPLES_PER_AXIS = 4;
export type SmoothLayerMode = 'analytic' | 'world' | 'clipped';

/** Paints continuous boundaries; clipped rasters retain their usual interior sampling. */
export class SmoothLayerPainter {
  private readonly boundary: Uint8Array;
  /** Bytes of the precomputed boundary raster; part of the layer's buffers. */
  readonly boundaryBytes: number;
  private readonly divisorX: number;
  private readonly divisorY: number;

  constructor(
    private readonly size: MapSize,
    private readonly data: RasterData,
    private readonly mask: SpatialMask | undefined,
    private readonly insideValue: number | undefined,
    private readonly writePixel: PixelWriter,
    private readonly geometry: SmoothGeometry,
    private readonly mode: SmoothLayerMode,
    private readonly skipValue?: number,
    private readonly boundaryAt?: (x: number, y: number) => number
  ) {
    this.divisorX = Math.max(1, size.width - 1);
    this.divisorY = Math.max(1, size.height - 1);
    this.boundary = new Uint8Array(size.width * size.height);
    this.boundaryBytes = this.boundary.byteLength;
    this.markBoundaryCells();
  }

  /** Marks boundary cells in one rolling-row pass instead of five lookups per cell. */
  private markBoundaryCells(): void {
    const { width, height } = this.size;
    const boundary = this.boundary;
    let previous = new Int32Array(width).fill(-1);
    let current = new Int32Array(width);
    let next = new Int32Array(width);
    this.fillRow(current, 0);

    for (let y = 0; y < height; y++) {
      if (y + 1 < height) {
        this.fillRow(next, y + 1);
      } else {
        next.fill(-1);
      }

      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        const value = current[x];
        if (
          value !== (x > 0 ? current[x - 1] : -1) ||
          value !== (x + 1 < width ? current[x + 1] : -1) ||
          value !== previous[x] ||
          value !== next[x]
        ) {
          boundary[rowOffset + x] = 1;
        }
      }

      const recycled = previous;
      previous = current;
      current = next;
      next = recycled;
    }
  }

  private fillRow(row: Int32Array, y: number): void {
    for (let x = 0; x < this.size.width; x++) {
      row[x] = this.boundaryValueAt(x, y);
    }
  }

  paint(pixels: Uint8ClampedArray, target: RenderTarget, tile: LayerTile): void {
    const { projection } = target;
    const inverse = 1 / projection.cellSize;
    const color = new Uint8ClampedArray(4);
    for (let row = 0; row < tile.height; row++) {
      const pixelY = tile.y + row;
      const cellY = Math.floor((pixelY + 0.5 - projection.top) * inverse);
      if (cellY < 0 || cellY >= this.size.height) {
        continue;
      }
      let offset = row * tile.width * 4;
      for (let column = 0; column < tile.width; column++, offset += 4) {
        const pixelX = tile.x + column;
        const cellX = Math.floor((pixelX + 0.5 - projection.left) * inverse);
        if (cellX < 0 || cellX >= this.size.width) {
          continue;
        }
        if (!this.isBoundaryPixel(pixelX, pixelY, cellX, cellY, target)) {
          if (this.mode !== 'clipped') {
            const value = this.valueAt(cellX, cellY);
            if (value >= 0) {
              this.writePixel(pixels, offset, value);
            }
          }
          continue;
        }

        pixels.fill(0, offset, offset + 4);

        let red = 0;
        let green = 0;
        let blue = 0;
        let covered = 0;
        for (let sampleY = 0; sampleY < SAMPLES_PER_AXIS; sampleY++) {
          const mapY = (pixelY + (sampleY + 0.5) / SAMPLES_PER_AXIS - projection.top) * inverse;
          const normalizedY = (mapY - 0.5) / this.divisorY;
          for (let sampleX = 0; sampleX < SAMPLES_PER_AXIS; sampleX++) {
            const mapX = (pixelX + (sampleX + 0.5) / SAMPLES_PER_AXIS - projection.left) * inverse;
            const normalizedX = (mapX - 0.5) / this.divisorX;
            if (!containsWorld(this.geometry.shape, 2 * normalizedX - 1, 2 * normalizedY - 1)) {
              continue;
            }
            const value = this.sampledValue(normalizedX, normalizedY, mapX, mapY);
            if (value < 0 || value === this.skipValue) {
              continue;
            }
            this.writePixel(color, 0, value);
            red += color[0];
            green += color[1];
            blue += color[2];
            covered++;
          }
        }
        if (covered > 0) {
          pixels[offset] = red / covered;
          pixels[offset + 1] = green / covered;
          pixels[offset + 2] = blue / covered;
          pixels[offset + 3] = (covered * 255) / (SAMPLES_PER_AXIS * SAMPLES_PER_AXIS);
        }
      }
    }
  }

  private isBoundaryPixel(
    pixelX: number,
    pixelY: number,
    cellX: number,
    cellY: number,
    target: RenderTarget
  ): boolean {
    if (this.boundary[cellY * this.size.width + cellX]) {
      return true;
    }
    const { projection } = target;
    if (projection.cellSize >= 1) {
      return false;
    }
    for (let dy = 0; dy <= 1; dy++) {
      for (let dx = 0; dx <= 1; dx++) {
        const x = pixelX + dx;
        const y = pixelY + dy;
        const sourceX = Math.floor((x - projection.left) / projection.cellSize);
        const sourceY = Math.floor((y - projection.top) / projection.cellSize);
        if (
          sourceX >= 0 &&
          sourceY >= 0 &&
          sourceX < this.size.width &&
          sourceY < this.size.height &&
          this.boundary[sourceY * this.size.width + sourceX]
        ) {
          return true;
        }
      }
    }
    return false;
  }

  private boundaryValueAt(x: number, y: number): number {
    const value = this.valueAt(x, y);
    return value < 0 || this.boundaryAt ? value : 1;
  }

  /** Value blended at a boundary sample: analytic borders, the world fill or the nearest cell. */
  private sampledValue(
    normalizedX: number,
    normalizedY: number,
    mapX: number,
    mapY: number
  ): number {
    if (this.boundaryAt) {
      return this.boundaryAt(normalizedX, normalizedY);
    }
    if (this.mode === 'world') {
      return this.insideValue ?? -1;
    }
    return this.nearestInsideValue(mapX, mapY);
  }

  private nearestInsideValue(mapX: number, mapY: number): number {
    const cellX = Math.floor(mapX);
    const cellY = Math.floor(mapY);
    const center = this.valueAt(cellX, cellY);
    if (center >= 0) {
      return center;
    }
    let nearest = -1;
    let bestDistance = Infinity;
    for (let y = cellY - 1; y <= cellY + 1; y++) {
      for (let x = cellX - 1; x <= cellX + 1; x++) {
        const value = this.valueAt(x, y);
        if (value < 0) {
          continue;
        }
        const distance = (x + 0.5 - mapX) ** 2 + (y + 0.5 - mapY) ** 2;
        if (distance < bestDistance) {
          bestDistance = distance;
          nearest = value;
        }
      }
    }
    return nearest;
  }

  private valueAt(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.size.width || y >= this.size.height) {
      return -1;
    }
    if (this.mask && !this.mask.contains(x, y)) {
      return -1;
    }
    const value = this.data[y * this.size.width + x];
    if (this.insideValue !== undefined && value !== this.insideValue) {
      return -1;
    }
    return value === this.skipValue ? -1 : value;
  }
}
