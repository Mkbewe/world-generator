import { MapLayer, type MapSize } from './layer';
import {
  compilePalette,
  type LayerSpec,
  type PixelWriter,
  type RasterData,
} from '../../map-layers';
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

  protected paintRow(
    pixels: Uint8ClampedArray,
    offset: number,
    y: number,
    xStart: number,
    xEnd: number
  ): void {
    if (this.spec.palette.kind === 'solid') {
      this.paintSolidRow(pixels, offset, y, xStart, xEnd);
      return;
    }

    let index = y * this.size.width + xStart;
    const insideValue = this.spec.providesMask?.insideValue;
    if (insideValue !== undefined) {
      for (let x = xStart; x < xEnd; x++, index++, offset += 4) {
        if (this.data[index] === insideValue) {
          this.writePixel(pixels, offset, this.data[index]);
        }
      }
      return;
    }

    const clipMask = this.clipMask;
    for (let x = xStart; x < xEnd; x++, index++, offset += 4) {
      if (clipMask && !clipMask.contains(x, y)) {
        continue;
      }
      this.writePixel(pixels, offset, this.data[index]);
    }
  }

  private paintSolidRow(
    pixels: Uint8ClampedArray,
    offset: number,
    y: number,
    xStart: number,
    xEnd: number
  ): void {
    const palette = this.spec.palette;
    if (palette.kind !== 'solid') {
      return;
    }
    const [red, green, blue] = palette.color;
    let index = y * this.size.width + xStart;
    const insideValue = this.spec.providesMask?.insideValue;
    if (insideValue !== undefined) {
      for (let x = xStart; x < xEnd; x++, index++, offset += 4) {
        if (this.data[index] !== insideValue) {
          continue;
        }
        pixels[offset] = red;
        pixels[offset + 1] = green;
        pixels[offset + 2] = blue;
        pixels[offset + 3] = 255;
      }
      return;
    }

    const clipMask = this.clipMask;
    for (let x = xStart; x < xEnd; x++, index++, offset += 4) {
      if (clipMask && !clipMask.contains(x, y)) {
        continue;
      }
      pixels[offset] = red;
      pixels[offset + 1] = green;
      pixels[offset + 2] = blue;
      pixels[offset + 3] = 255;
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
