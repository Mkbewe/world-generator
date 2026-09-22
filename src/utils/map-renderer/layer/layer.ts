import { type RenderTarget, targetKey } from '../preview-targets';
import type { MapBaseLayerId } from '../types';

export interface MapSize {
  width: number;
  height: number;
}

export type TileReporter = (x: number, y: number, width: number, height: number) => void;

export interface LayerRenderStatistics {
  durationMs: number;
  tiles: number;
  pixels: number;
}

/** Output tile of the preview buffer, in canvas pixels. */
export interface LayerTile {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

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

/** Longest side of the whole-map fallback surface, in pixels. */
const OVERVIEW_MAX_PX = 512;

export abstract class MapLayer {
  /** Stable surface with the last completed frame; only `commit` writes here. */
  readonly canvas = document.createElement('canvas');
  /** Render buffer for the frame in flight; visible only through progressive tiles. */
  readonly stage = document.createElement('canvas');
  /** Whole-map fallback drawn under the sharp frame while the view outruns it. */
  readonly overview = document.createElement('canvas');
  private overviewSurfaceTarget?: RenderTarget;
  private preparation?: Promise<void>;
  private preparationSignal?: AbortSignal;
  private preparationKey?: string;
  private preparing = false;
  private activeTarget?: RenderTarget;
  statistics?: LayerRenderStatistics;

  protected constructor(
    readonly id: MapBaseLayerId,
    readonly size: MapSize
  ) {}

  /** Whether a render is currently writing into this layer's stage buffer. */
  get busy(): boolean {
    return this.preparing;
  }

  /** Target of the render in flight, or undefined when the layer is idle. */
  get renderingTarget(): RenderTarget | undefined {
    return this.preparing ? this.activeTarget : undefined;
  }

  /** Projection of the whole-map fallback, or undefined before the first render. */
  get overviewTarget(): RenderTarget | undefined {
    return this.overviewSurfaceTarget;
  }

  /** Estimated RGBA bytes of all surfaces held for this layer. */
  get bufferBytes(): number {
    const pixels =
      this.canvas.width * this.canvas.height +
      this.stage.width * this.stage.height +
      this.overview.width * this.overview.height;
    return pixels * 4 + this.extraBufferBytes();
  }

  /** Bytes held outside the canvases, e.g. precomputed masks; subclasses may extend. */
  protected extraBufferBytes(): number {
    return 0;
  }

  /**
   * Whether transparent overview pixels take the color of the nearest painted
   * cell. Layers whose transparency is meaningful, e.g. water in an id map, opt
   * out so the fallback keeps their empty areas empty.
   */
  protected get overviewExtendsColors(): boolean {
    return true;
  }

  prepare(signal: AbortSignal, target: RenderTarget, onTile?: TileReporter): Promise<void> {
    const key = targetKey(target);
    if (this.preparation && this.preparationKey === key) {
      const reusable =
        !this.preparing || this.preparationSignal === signal || !this.preparationSignal?.aborted;
      if (reusable) {
        return this.preparation;
      }
    }
    this.preparationSignal = signal;
    this.preparationKey = key;
    this.preparing = true;
    this.activeTarget = target;
    const preparation = this.render(signal, target, onTile);
    this.preparation = preparation;
    void preparation.then(
      () => this.settle(preparation),
      () => {
        if (this.preparation === preparation) {
          this.preparation = undefined;
        }
        this.settle(preparation);
      }
    );
    return preparation;
  }

  /** Releases the in-flight state unless a newer render already took it over. */
  private settle(preparation: Promise<void>): void {
    if (this.preparation !== preparation && this.preparation !== undefined) {
      return;
    }
    // The stage buffer is only needed while a frame is being painted.
    this.stage.width = this.stage.height = 0;
    this.preparing = false;
    this.activeTarget = undefined;
  }

  dispose(): void {
    this.canvas.width = this.canvas.height = 0;
    this.stage.width = this.stage.height = 0;
    this.overview.width = this.overview.height = 0;
    this.overviewSurfaceTarget = undefined;
    this.preparation = undefined;
    this.preparationSignal = undefined;
    this.preparationKey = undefined;
    this.preparing = false;
    this.activeTarget = undefined;
  }

  /** Raw value at a source raster cell, or undefined outside the layer's valid area. */
  abstract sample(x: number, y: number): number | undefined;

  protected abstract paintTile(
    pixels: Uint8ClampedArray,
    target: RenderTarget,
    tile: LayerTile
  ): void;

  private async render(
    signal: AbortSignal,
    target: RenderTarget,
    onTile?: TileReporter
  ): Promise<void> {
    signal.throwIfAborted();
    this.renderOverview(signal);
    const startedAt = performance.now();
    const { width, height } = target;
    const context = this.stage.getContext('2d');
    if (!context) {
      throw new Error('Canvas is not available.');
    }
    this.stage.width = width;
    this.stage.height = height;

    const statistics = { durationMs: performance.now() - startedAt, tiles: 0, pixels: 0 };
    this.statistics = statistics;
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
        statistics.tiles++;
        statistics.pixels += tileW * tileH;
        statistics.durationMs += performance.now() - tileStartedAt;
        await yieldToBrowser();
      }
    }
    signal.throwIfAborted();
    const commitStartedAt = performance.now();
    this.commit(target);
    statistics.durationMs += performance.now() - commitStartedAt;
  }

  /** Paints the whole map once into a small surface, the fallback for fast view changes. */
  private renderOverview(signal: AbortSignal): void {
    const { width, height } = this.size;
    if (width <= 0 || height <= 0) {
      return;
    }
    const cellSize = OVERVIEW_MAX_PX / Math.max(width, height);
    const target: RenderTarget = {
      width: Math.max(1, Math.round(width * cellSize)),
      height: Math.max(1, Math.round(height * cellSize)),
      projection: {
        cellSize,
        left: 0,
        top: 0,
        width: width * cellSize,
        height: height * cellSize,
      },
    };
    if (this.overviewSurfaceTarget && targetKey(this.overviewSurfaceTarget) === targetKey(target)) {
      return;
    }
    signal.throwIfAborted();
    const context = this.overview.getContext('2d');
    if (!context) {
      throw new Error('Canvas is not available.');
    }
    this.overview.width = target.width;
    this.overview.height = target.height;
    const image = context.createImageData(target.width, target.height);
    this.paintTile(image.data, target, { x: 0, y: 0, width: target.width, height: target.height });
    if (this.overviewExtendsColors) {
      extendOverviewColors(image.data, target.width, target.height);
    }
    context.putImageData(image, 0, 0);
    this.overviewSurfaceTarget = target;
  }

  /** Copies the finished frame onto the stable surface; the display never sees a partial one. */
  private commit(target: RenderTarget): void {
    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas is not available.');
    }
    this.canvas.width = target.width;
    this.canvas.height = target.height;
    context.drawImage(this.stage, 0, 0);
  }
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
