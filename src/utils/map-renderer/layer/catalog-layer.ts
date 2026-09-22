import { type LayerTile, MapLayer, type MapSize } from './layer';
import type { SmoothGeometry } from './smooth-geometry';
import { type SmoothLayerMode, SmoothLayerPainter } from './smooth-layer-painter';
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
  private readonly smoothPainter?: SmoothLayerPainter;
  private readonly smoothInterior: boolean;

  constructor(
    readonly spec: LayerSpec<MapBaseLayerId>,
    size: MapSize,
    value: unknown,
    private readonly clipMask?: SpatialMask,
    geometry?: SmoothGeometry
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
    const boundary = resolveBoundary(spec, geometry);
    const mode = smoothMode(spec, boundary);
    this.smoothInterior = mode !== 'clipped';
    if (geometry && (boundary || spec.providesMask || clipMask)) {
      this.smoothPainter = new SmoothLayerPainter(
        size,
        this.data,
        clipMask,
        spec.providesMask?.insideValue,
        this.writePixel,
        geometry,
        mode,
        spec.skipValue,
        boundary
      );
    }
  }

  contains(x: number, y: number): boolean {
    const insideValue = this.spec.providesMask?.insideValue;
    return insideValue !== undefined && this.data[y * this.size.width + x] === insideValue;
  }

  protected extraBufferBytes(): number {
    return this.smoothPainter?.boundaryBytes ?? 0;
  }

  /** A skip value marks real empty area, so the overview must not fill it in. */
  protected get overviewExtendsColors(): boolean {
    return this.spec.skipValue === undefined;
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

  protected paintTile(pixels: Uint8ClampedArray, target: RenderTarget, tile: LayerTile): void {
    if (this.smoothPainter && this.smoothInterior) {
      this.smoothPainter.paint(pixels, target, tile);
      return;
    }
    const samples =
      this.spec.palette.kind === 'ramp' ? filterSamplesPerAxis(target.projection.cellSize) : 1;
    if (samples > 1) {
      this.paintFilteredTile(pixels, target, tile, samples);
    } else {
      this.paintNearestTile(pixels, target, tile);
    }
    this.smoothPainter?.paint(pixels, target, tile);
  }

  /** Samples the nearest source cell for every pixel of the output tile. */
  private paintNearestTile(pixels: Uint8ClampedArray, target: RenderTarget, tile: LayerTile): void {
    const { projection } = target;
    const inverseCellSize = 1 / projection.cellSize;
    const insideValue = this.spec.providesMask?.insideValue;
    const skipValue = this.spec.skipValue;
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
        if (value === skipValue) {
          continue;
        }
        if (clipMask && !clipMask.contains(cellX, cellY)) {
          continue;
        }
        this.writePixel(pixels, offset, value);
      }
    }
  }

  /** Averages a sample grid over the cells covered by each output pixel (minification). */
  private paintFilteredTile(
    pixels: Uint8ClampedArray,
    target: RenderTarget,
    tile: LayerTile,
    samples: number
  ): void {
    const { projection } = target;
    const inverse = 1 / projection.cellSize;
    const footprint = inverse;
    const step = footprint / samples;
    const firstOffset = step / 2 - footprint / 2;
    const clipMask = this.clipMask;
    const mapWidth = this.size.width;
    const mapHeight = this.size.height;

    for (let row = 0; row < tile.height; row++) {
      const centerY = (tile.y + row + 0.5 - projection.top) * inverse;
      const firstY = centerY + firstOffset;
      const sampleRows: number[] = [];
      for (let sample = 0; sample < samples; sample++) {
        sampleRows.push(Math.floor(firstY + sample * step));
      }
      let offset = row * tile.width * 4;
      for (let column = 0; column < tile.width; column++, offset += 4) {
        const centerX = (tile.x + column + 0.5 - projection.left) * inverse;
        const firstX = centerX + firstOffset;
        let sum = 0;
        let count = 0;
        for (let sampleY = 0; sampleY < samples; sampleY++) {
          const cellY = sampleRows[sampleY];
          if (cellY < 0 || cellY >= mapHeight) {
            continue;
          }
          const rowIndex = cellY * mapWidth;
          for (let sampleX = 0; sampleX < samples; sampleX++) {
            const cellX = Math.floor(firstX + sampleX * step);
            if (cellX < 0 || cellX >= mapWidth) {
              continue;
            }
            if (clipMask && !clipMask.contains(cellX, cellY)) {
              continue;
            }
            sum += this.data[rowIndex + cellX];
            count++;
          }
        }
        if (count > 0) {
          this.writePixel(pixels, offset, sum / count);
        }
      }
    }
  }
}

/** Analytic classifier a layer declares, when the map carries the matching geometry. */
function resolveBoundary(
  spec: LayerSpec<MapBaseLayerId>,
  geometry?: SmoothGeometry
): ((x: number, y: number) => number) | undefined {
  if (spec.boundarySource === 'region') {
    return geometry?.regionAt;
  }
  if (spec.boundarySource === 'landmass') {
    return geometry?.landmassAt;
  }
  return undefined;
}

/** How a layer smooths its edges: analytic borders, the world edge or none. */
function smoothMode(
  spec: LayerSpec<MapBaseLayerId>,
  boundary: ((x: number, y: number) => number) | undefined
): SmoothLayerMode {
  if (boundary) {
    return 'analytic';
  }
  if (spec.providesMask) {
    return 'world';
  }
  return 'clipped';
}

/** Samples per axis for minified float layers; capped to keep repaints responsive. */
const MAX_FILTER_SAMPLES = 3;

function filterSamplesPerAxis(cellSize: number): number {
  if (cellSize >= 1) {
    return 1;
  }
  return Math.min(MAX_FILTER_SAMPLES, Math.max(2, Math.ceil(1 / cellSize)));
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
