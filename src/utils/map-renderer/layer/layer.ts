import type { MapBaseLayerId, SpatialMask } from '../types';

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

export abstract class MapLayer {
  readonly canvas = document.createElement('canvas');
  private preparation?: Promise<void>;
  statistics?: LayerRenderStatistics;

  protected constructor(
    readonly id: MapBaseLayerId,
    readonly size: MapSize
  ) {}

  prepare(signal: AbortSignal, onTile?: TileReporter): Promise<void> {
    if (!this.preparation) {
      const preparation = this.render(signal, onTile);
      this.preparation = preparation;
      void preparation.catch(() => {
        if (this.preparation === preparation) {
          this.preparation = undefined;
        }
      });
    }
    return this.preparation;
  }

  show(canvas: HTMLCanvasElement): void {
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas is not available.');
    }
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(this.canvas, 0, 0);
  }

  dispose(): void {
    this.canvas.width = this.canvas.height = 0;
    this.preparation = undefined;
  }

  protected abstract paintRow(
    pixels: Uint8ClampedArray,
    offset: number,
    y: number,
    xStart: number,
    xEnd: number
  ): void;

  private async render(signal: AbortSignal, onTile?: TileReporter): Promise<void> {
    signal.throwIfAborted();
    const startedAt = performance.now();
    const { width, height } = this.size;
    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas is not available.');
    }
    this.canvas.width = width;
    this.canvas.height = height;

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
        for (let row = 0; row < tileH; row++) {
          this.paintRow(image.data, row * tileW * 4, top + row, left, left + tileW);
        }
        context.putImageData(image, left, top);
        onTile?.(left, top, tileW, tileH);
        statistics.tiles++;
        statistics.pixels += tileW * tileH;
        statistics.durationMs += performance.now() - tileStartedAt;
        await yieldToBrowser();
      }
    }
    signal.throwIfAborted();
  }
}

export class WorldShapeLayer extends MapLayer implements SpatialMask {
  constructor(
    size: MapSize,
    readonly mask: Uint8Array
  ) {
    super('world-shape', size);
  }

  contains(x: number, y: number): boolean {
    return this.mask[y * this.size.width + x] === 1;
  }

  protected paintRow(
    pixels: Uint8ClampedArray,
    offset: number,
    y: number,
    xStart: number,
    xEnd: number
  ): void {
    for (let x = xStart; x < xEnd; x++, offset += 4) {
      if (!this.contains(x, y)) {
        continue;
      }
      pixels[offset] = 16;
      pixels[offset + 1] = 42;
      pixels[offset + 2] = 67;
      pixels[offset + 3] = 255;
    }
  }
}

export class NoiseLayer extends MapLayer {
  constructor(
    readonly world: SpatialMask,
    readonly noise: Float32Array
  ) {
    super('noise', world.size);
  }

  protected paintRow(
    pixels: Uint8ClampedArray,
    offset: number,
    y: number,
    xStart: number,
    xEnd: number
  ): void {
    let index = y * this.size.width + xStart;
    for (let x = xStart; x < xEnd; x++, index++, offset += 4) {
      if (!this.world.contains(x, y)) {
        continue;
      }
      const value = Math.round(this.noise[index] * 255);
      pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = value;
      pixels[offset + 3] = 255;
    }
  }
}
