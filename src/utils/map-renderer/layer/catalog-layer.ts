import { type LayerTile, MapLayer, type MapSize } from './layer';
import {
  compilePalette,
  type LayerSpec,
  type PixelWriter,
  type RasterData,
} from '../../map-layers';
import type { RenderTarget } from '../preview-targets';
import type { MapBaseLayerId, SpatialMask } from '../types';

/** Generic validated raster rendered through a catalog palette. */
export class CatalogLayer extends MapLayer implements SpatialMask {
  readonly data: RasterData;
  private readonly writePixel: PixelWriter;

  constructor(
    readonly spec: LayerSpec<MapBaseLayerId>,
    size: MapSize,
    value: unknown,
    private readonly clipMask?: SpatialMask
  ) {
    super(spec.id, size);
    this.data = validateRasterData(spec, size, value);
    if (spec.clipTo && !clipMask) {
      throw new Error(`Layer "${spec.id}" requires "${spec.clipTo}".`);
    }
    if (clipMask && (clipMask.size.width !== size.width || clipMask.size.height !== size.height)) {
      throw new Error(`Layer "${spec.id}" received an invalid clip mask size.`);
    }
    this.writePixel = compilePalette(spec.palette);
  }

  contains(x: number, y: number): boolean {
    const insideValue = this.spec.providesMask?.insideValue;
    return insideValue !== undefined && this.data[y * this.size.width + x] === insideValue;
  }

  sample(x: number, y: number): number | undefined {
    if (x < 0 || y < 0 || x >= this.size.width || y >= this.size.height) {
      return undefined;
    }
    if (this.clipMask && !this.clipMask.contains(x, y)) {
      return undefined;
    }
    return this.data[y * this.size.width + x];
  }

  /** Samples the nearest source cell for every pixel of the output tile. */
  protected paintTile(pixels: Uint8ClampedArray, target: RenderTarget, tile: LayerTile): void {
    const { projection } = target;
    const inverseCellSize = 1 / projection.cellSize;
    const insideValue = this.spec.providesMask?.insideValue;
    const clipMask = this.clipMask;
    const mapWidth = this.size.width;
    const mapHeight = this.size.height;

    for (let row = 0; row < tile.height; row++) {
      const cellY = Math.floor((tile.y + row + 0.5 - projection.top) * inverseCellSize);
      if (cellY < 0 || cellY >= mapHeight) {
        continue;
      }
      const rowIndex = cellY * mapWidth;
      let offset = row * tile.width * 4;
      for (let column = 0; column < tile.width; column++, offset += 4) {
        const cellX = Math.floor((tile.x + column + 0.5 - projection.left) * inverseCellSize);
        if (cellX < 0 || cellX >= mapWidth) {
          continue;
        }
        const value = this.data[rowIndex + cellX];
        if (insideValue !== undefined && value !== insideValue) {
          continue;
        }
        if (clipMask && !clipMask.contains(cellX, cellY)) {
          continue;
        }
        this.writePixel(pixels, offset, value);
      }
    }
  }
}

function validateRasterData(
  spec: LayerSpec<MapBaseLayerId>,
  size: MapSize,
  value: unknown
): RasterData {
  let data: RasterData;
  if (spec.dataType === 'uint8') {
    if (!(value instanceof Uint8Array)) {
      throw new Error(`Invalid ${sourceName(spec.source)}.`);
    }
    data = value;
  } else {
    if (!(value instanceof Float32Array)) {
      throw new Error(`Invalid ${sourceName(spec.source)}.`);
    }
    data = value;
  }
  if (data.length !== size.width * size.height) {
    throw new Error(`Invalid "${spec.id}" data size.`);
  }
  return data;
}

function sourceName(source: string): string {
  return source.replaceAll(/([a-z\d])([A-Z])/g, '$1 $2').toLowerCase();
}
