import { type LayerTile, MapLayer, type MapSize, type TileReporter } from './layer';
import type { SmoothGeometry } from './smooth-geometry';
import { type SmoothLayerMode, SmoothLayerPainter } from './smooth-layer-painter';
import {
  compilePalette,
  type PixelWriter,
  type RasterData,
  type RasterLayerSpec,
} from '../../map-layers';
import { type RenderTarget, targetKey } from '../preview-targets';
import type { MapBaseLayerId, SpatialMask } from '../types';

/** Progressive raster drawing splits the frame into this many tiles per axis. */
const TILES_PER_AXIS = 10;

function createYieldToBrowser(): () => Promise<void> {
  if (typeof MessageChannel === 'undefined') {
    return () => new Promise(resolve => setTimeout(resolve, 0));
  }
  const channel = new MessageChannel();
  const resolvers: (() => void)[] = [];
  channel.port1.onmessage = () => resolvers.shift()?.();
  channel.port1.start();
  return () =>
    new Promise(resolve => {
      resolvers.push(resolve);
      channel.port2.postMessage(undefined);
    });
}

const yieldToBrowser = createYieldToBrowser();

/** Generic validated raster rendered through a catalog palette. */
export class CatalogLayer extends MapLayer implements SpatialMask {
  readonly data: RasterData;
  private readonly writePixel: PixelWriter;
  private readonly smoothPainter?: SmoothLayerPainter;
  private readonly smoothInterior: boolean;

  constructor(
    readonly spec: RasterLayerSpec<MapBaseLayerId>,
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
  private get overviewExtendsColors(): boolean {
    return this.spec.skipValue === undefined;
  }

  /** Draws the frame as a grid of pixel tiles, yielding between them. */
  protected async renderFrame(
    signal: AbortSignal,
    target: RenderTarget,
    context: CanvasRenderingContext2D,
    onTile?: TileReporter
  ): Promise<void> {
    const { width, height } = target;
    const tileWidth = Math.ceil(width / TILES_PER_AXIS);
    const tileHeight = Math.ceil(height / TILES_PER_AXIS);
    for (let top = 0; top < height; top += tileHeight) {
      const tileH = Math.min(tileHeight, height - top);
      for (let left = 0; left < width; left += tileWidth) {
        signal.throwIfAborted();
        const tileStartedAt = performance.now();
        const tileW = Math.min(tileWidth, width - left);
        const image = context.createImageData(tileW, tileH);
        this.paintTile(image.data, target, { x: left, y: top, width: tileW, height: tileH });
        context.putImageData(image, left, top);
        onTile?.(left, top, tileW, tileH);
        this.addFrameStatistics(performance.now() - tileStartedAt, 1, tileW * tileH);
        await yieldToBrowser();
      }
    }
  }

  /** Paints the whole map once into a small surface, the fallback for fast view changes. */
  protected renderOverview(signal: AbortSignal): void {
    const target = this.fallbackTarget();
    if (!target) {
      return;
    }
    if (this.overviewSurfaceTarget && targetKey(this.overviewSurfaceTarget) === targetKey(target)) {
      return;
    }
    signal.throwIfAborted();
    const context = this.surfaceContext(this.overview, target);
    const image = context.createImageData(target.width, target.height);
    this.paintTile(image.data, target, { x: 0, y: 0, width: target.width, height: target.height });
    if (this.overviewExtendsColors) {
      extendOverviewColors(image.data, target.width, target.height);
    }
    context.putImageData(image, 0, 0);
    this.overviewSurfaceTarget = target;
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

  private paintTile(pixels: Uint8ClampedArray, target: RenderTarget, tile: LayerTile): void {
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
  spec: RasterLayerSpec<MapBaseLayerId>,
  geometry?: SmoothGeometry
): ((x: number, y: number) => number) | undefined {
  if (spec.boundarySource === 'region') {
    return geometry?.regionAt;
  }
  return undefined;
}

/** How a layer smooths its edges: analytic borders, the world edge or none. */
function smoothMode(
  spec: RasterLayerSpec<MapBaseLayerId>,
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
  spec: RasterLayerSpec<MapBaseLayerId>,
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

/** Extends edge colors outside the world so a screen-space clip has no transparent fringe. */
function extendOverviewColors(pixels: Uint8ClampedArray, width: number, height: number): void {
  const count = width * height;
  let empty = false;
  for (let index = 0; index < count; index++) {
    const alpha = index * 4 + 3;
    if (pixels[alpha] === 0) {
      empty = true;
    } else {
      pixels[alpha] = 255;
    }
  }
  if (!empty) {
    return;
  }
  const queue = new Uint32Array(count);
  let tail = 0;
  for (let index = 0; index < count; index++) {
    if (pixels[index * 4 + 3] === 255) {
      queue[tail++] = index;
    }
  }
  for (let head = 0; head < tail; head++) {
    const index = queue[head];
    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) {
      fillNeighbor(index - 1, index);
    }
    if (x + 1 < width) {
      fillNeighbor(index + 1, index);
    }
    if (y > 0) {
      fillNeighbor(index - width, index);
    }
    if (y + 1 < height) {
      fillNeighbor(index + width, index);
    }
  }

  function fillNeighbor(index: number, source: number): void {
    const offset = index * 4;
    if (pixels[offset + 3] !== 0) {
      return;
    }
    const from = source * 4;
    pixels[offset] = pixels[from];
    pixels[offset + 1] = pixels[from + 1];
    pixels[offset + 2] = pixels[from + 2];
    pixels[offset + 3] = 255;
    queue[tail++] = index;
  }
}
