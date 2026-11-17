import type { CategoricalBoundaryStyle, PixelWriter, RasterData } from '@layers';

import type { SmoothGeometry } from './smooth-geometry';
import { smoothstep } from '../../../math';
import { containsWorld } from '../../../world-shape';
import type { RenderTarget } from '../../preview-targets';
import type { SpatialMask } from '../../types';
import { cellAtPixel } from '../../view/cell-at-pixel';
import type { LayerTile, MapSize } from '../layer';

const SAMPLES_PER_AXIS = 4;
export type SmoothLayerMode = 'analytic' | 'world' | 'clipped' | 'categorical';

export interface CategoricalBoundaryOptions {
  readonly distances: Float32Array;
  readonly style?: CategoricalBoundaryStyle;
  /** Source raster shape when it differs from the map sample grid. */
  readonly sourceSize?: MapSize;
}

/** Paints continuous boundaries; clipped rasters retain their usual interior sampling. */
export class SmoothLayerPainter {
  private readonly boundary: Uint8Array;
  /** Bytes of the precomputed boundary raster; part of the layer's buffers. */
  readonly boundaryBytes: number;
  private readonly divisorX: number;
  private readonly divisorY: number;
  private readonly distances?: Float32Array;
  private readonly style?: CategoricalBoundaryStyle;
  private readonly categoricalSize: MapSize;
  private selectedOwner = -1;

  constructor(
    private readonly size: MapSize,
    private readonly data: RasterData,
    private readonly mask: SpatialMask | undefined,
    private readonly insideValue: number | undefined,
    private readonly writePixel: PixelWriter,
    private readonly geometry: SmoothGeometry,
    private readonly mode: SmoothLayerMode,
    private readonly skipValue?: number,
    private readonly boundaryAt?: (x: number, y: number) => number,
    boundaryOptions?: CategoricalBoundaryOptions
  ) {
    this.divisorX = Math.max(1, size.width - 1);
    this.divisorY = Math.max(1, size.height - 1);
    this.distances = boundaryOptions?.distances;
    this.style = boundaryOptions?.style;
    this.categoricalSize = boundaryOptions?.sourceSize ?? size;
    if (mode === 'categorical') {
      this.boundary = new Uint8Array(0);
      this.boundaryBytes = 0;
      return;
    }
    this.boundary = new Uint8Array(size.width * size.height);
    this.boundaryBytes = this.boundary.byteLength;
    this.markBoundaryCells();
  }

  setSelectedOwner(owner: number): void {
    this.selectedOwner = owner;
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

  paint(pixels: Uint8ClampedArray, target: RenderTarget, tile: LayerTile, showGutter = true): void {
    if (this.mode === 'categorical') {
      this.paintCategorical(pixels, target, tile, showGutter);
      return;
    }
    const { projection } = target;
    const inverse = 1 / projection.cellSize;
    const color = new Uint8ClampedArray(4);
    const styled = this.style !== undefined;
    const stylePixelSize = styled
      ? Math.min(
          (this.size.width * projection.cellSize) / this.categoricalSize.width,
          (this.size.height * projection.cellSize) / this.categoricalSize.height
        )
      : 1;
    for (let row = 0; row < tile.height; row++) {
      let offset = row * tile.width * 4;
      for (let column = 0; column < tile.width; column++, offset += 4) {
        const pixelX = tile.x + column;
        const pixelY = tile.y + row;
        const cellIndex = cellAtPixel(projection, this.size, pixelX, pixelY);
        if (cellIndex < 0) {
          continue;
        }
        const cellX = cellIndex % this.size.width;
        const cellY = (cellIndex - cellX) / this.size.width;
        if (!this.isBoundaryPixel(pixelX, pixelY, cellX, cellY, target)) {
          if (this.mode !== 'clipped') {
            const value = this.valueAt(cellX, cellY);
            if (value !== undefined) {
              this.writePixel(pixels, offset, value);
              if (styled) {
                this.applyStyle(
                  pixels,
                  offset,
                  value,
                  (pixelX + 0.5 - projection.left) * inverse,
                  (pixelY + 0.5 - projection.top) * inverse,
                  cellX,
                  cellY,
                  stylePixelSize,
                  showGutter
                );
              }
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
          const sampleMapY =
            (pixelY + (sampleY + 0.5) / SAMPLES_PER_AXIS - projection.top) * inverse;
          const normalizedY = (sampleMapY - 0.5) / this.divisorY;
          for (let sampleX = 0; sampleX < SAMPLES_PER_AXIS; sampleX++) {
            const sampleMapX =
              (pixelX + (sampleX + 0.5) / SAMPLES_PER_AXIS - projection.left) * inverse;
            const normalizedX = (sampleMapX - 0.5) / this.divisorX;
            if (!containsWorld(this.geometry.shape, 2 * normalizedX - 1, 2 * normalizedY - 1)) {
              continue;
            }
            const value = this.sampledValue(normalizedX, normalizedY, sampleMapX, sampleMapY);
            if (value === undefined || value === this.skipValue) {
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
          const value = this.valueAt(cellX, cellY);
          if (value !== undefined && styled) {
            this.applyStyle(
              pixels,
              offset,
              value,
              (pixelX + 0.5 - projection.left) * inverse,
              (pixelY + 0.5 - projection.top) * inverse,
              cellX,
              cellY,
              stylePixelSize,
              showGutter
            );
          }
        }
      }
    }
  }

  /** Flat categorical fill with optional screen-space gutters and a selected band. */
  private paintCategorical(
    pixels: Uint8ClampedArray,
    target: RenderTarget,
    tile: LayerTile,
    showGutter: boolean
  ): void {
    const { projection } = target;
    const inverse = 1 / projection.cellSize;
    const styled = this.style !== undefined;
    const raster = this.categoricalSize;
    const scaleX = (raster.width - 1) / Math.max(1, this.size.width - 1);
    const scaleY = (raster.height - 1) / Math.max(1, this.size.height - 1);
    const rasterPixelSize = styled
      ? Math.min(
          (this.size.width * projection.cellSize) / raster.width,
          (this.size.height * projection.cellSize) / raster.height
        )
      : 1;
    const rasterXs = new Float64Array(tile.width);
    const cellXs = new Int32Array(tile.width);
    for (let column = 0; column < tile.width; column++) {
      const mapX = (tile.x + column + 0.5 - projection.left) * inverse;
      if (mapX < 0 || mapX >= this.size.width) {
        cellXs[column] = -1;
        continue;
      }
      const rasterX = (mapX - 0.5) * scaleX + 0.5;
      rasterXs[column] = rasterX;
      cellXs[column] = Math.max(0, Math.min(raster.width - 1, Math.floor(rasterX)));
    }
    for (let row = 0; row < tile.height; row++) {
      const mapY = (tile.y + row + 0.5 - projection.top) * inverse;
      if (mapY < 0 || mapY >= this.size.height) {
        continue;
      }
      const rasterY = (mapY - 0.5) * scaleY + 0.5;
      const cellY = Math.max(0, Math.min(raster.height - 1, Math.floor(rasterY)));
      let offset = row * tile.width * 4;
      for (let column = 0; column < tile.width; column++, offset += 4) {
        const cellX = cellXs[column];
        if (cellX < 0) {
          continue;
        }
        const value = this.data[cellY * raster.width + cellX];
        if (value === undefined || value === this.skipValue) {
          continue;
        }
        this.writePixel(pixels, offset, value);
        if (!styled) {
          continue;
        }
        this.applyStyle(
          pixels,
          offset,
          value,
          rasterXs[column],
          rasterY,
          cellX,
          cellY,
          rasterPixelSize,
          showGutter
        );
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
    if (value === undefined) {
      return -1;
    }
    return this.boundaryAt ? value : 1;
  }

  /** Value blended at a boundary sample: analytic borders, the world fill or the nearest cell. */
  private sampledValue(
    normalizedX: number,
    normalizedY: number,
    mapX: number,
    mapY: number
  ): number | undefined {
    if (this.boundaryAt) {
      const value = this.boundaryAt(normalizedX, normalizedY);
      return value >= 0 ? value : undefined;
    }
    if (this.mode === 'world') {
      return this.insideValue;
    }
    return this.nearestInsideValue(mapX, mapY);
  }

  private nearestInsideValue(mapX: number, mapY: number): number | undefined {
    const cellX = Math.floor(mapX);
    const cellY = Math.floor(mapY);
    const center = this.valueAt(cellX, cellY);
    if (center !== undefined) {
      return center;
    }
    let nearest: number | undefined;
    let bestDistance = Infinity;
    for (let y = cellY - 1; y <= cellY + 1; y++) {
      for (let x = cellX - 1; x <= cellX + 1; x++) {
        const value = this.valueAt(x, y);
        if (value === undefined) {
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

  private applyStyle(
    pixels: Uint8ClampedArray,
    offset: number,
    owner: number,
    rasterX: number,
    rasterY: number,
    cellX: number,
    cellY: number,
    rasterPixelSize: number,
    showGutter: boolean
  ): void {
    const style = this.style;
    if (!style || !this.distances) {
      return;
    }
    const gutter = showGutter ? style.gutter : undefined;
    const highlight = style.highlight && owner === this.selectedOwner ? style.highlight : undefined;
    if (!gutter && !highlight) {
      return;
    }
    const distancePx = this.borderDistanceAt(rasterX, rasterY, cellX, cellY) * rasterPixelSize;
    let red = pixels[offset];
    let green = pixels[offset + 1];
    let blue = pixels[offset + 2];
    if (gutter) {
      const coverage = smoothstep(
        (distancePx - gutter.halfWidthPx + gutter.fadePx / 2) / gutter.fadePx
      );
      red = Math.round(gutter.color[0] + (red - gutter.color[0]) * coverage);
      green = Math.round(gutter.color[1] + (green - gutter.color[1]) * coverage);
      blue = Math.round(gutter.color[2] + (blue - gutter.color[2]) * coverage);
    }
    if (highlight) {
      const accent =
        smoothstep((distancePx - highlight.innerPx) / highlight.fadePx) *
        (1 - smoothstep((distancePx - highlight.innerPx - highlight.bandPx) / highlight.fadePx));
      red = Math.round(red + (highlight.color[0] - red) * accent);
      green = Math.round(green + (highlight.color[1] - green) * accent);
      blue = Math.round(blue + (highlight.color[2] - blue) * accent);
    }
    pixels[offset] = red;
    pixels[offset + 1] = green;
    pixels[offset + 2] = blue;
  }

  private borderDistanceAt(rasterX: number, rasterY: number, cellX: number, cellY: number): number {
    const distances = this.distances;
    if (!distances) {
      return 0;
    }
    const { width, height } = this.categoricalSize;
    const index = cellY * width + cellX;
    const owner = this.data[index];
    let distance = bilinearDistance(distances, width, height, rasterX - 0.5, rasterY - 0.5);
    if (cellX > 0 && differentOwner(owner, this.data[index - 1])) {
      distance = Math.min(distance, rasterX - cellX);
    }
    if (cellX + 1 < width && differentOwner(owner, this.data[index + 1])) {
      distance = Math.min(distance, cellX + 1 - rasterX);
    }
    if (cellY > 0 && differentOwner(owner, this.data[index - width])) {
      distance = Math.min(distance, rasterY - cellY);
    }
    if (cellY + 1 < height && differentOwner(owner, this.data[index + width])) {
      distance = Math.min(distance, cellY + 1 - rasterY);
    }
    return distance;
  }

  /** Missing cells stay distinct from valid negative heights and depths. */
  private valueAt(x: number, y: number): number | undefined {
    if (x < 0 || y < 0 || x >= this.size.width || y >= this.size.height) {
      return undefined;
    }
    if (this.mask && !this.mask.contains(x, y)) {
      return undefined;
    }
    const value = this.data[y * this.size.width + x];
    if (this.insideValue !== undefined && value !== this.insideValue) {
      return undefined;
    }
    return value === this.skipValue ? undefined : value;
  }
}

function bilinearDistance(
  distances: Float32Array,
  width: number,
  height: number,
  x: number,
  y: number
): number {
  const fromX = Math.max(0, Math.min(width - 1, Math.floor(x)));
  const fromY = Math.max(0, Math.min(height - 1, Math.floor(y)));
  const toX = Math.min(width - 1, fromX + 1);
  const toY = Math.min(height - 1, fromY + 1);
  const shareX = Math.max(0, Math.min(1, x - fromX));
  const shareY = Math.max(0, Math.min(1, y - fromY));
  const top =
    distances[fromY * width + fromX] * (1 - shareX) + distances[fromY * width + toX] * shareX;
  const bottom =
    distances[toY * width + fromX] * (1 - shareX) + distances[toY * width + toX] * shareX;
  return top * (1 - shareY) + bottom * shareY;
}

function differentOwner(owner: number, other: number | undefined): boolean {
  return other !== undefined && other >= 0 && other !== owner;
}
