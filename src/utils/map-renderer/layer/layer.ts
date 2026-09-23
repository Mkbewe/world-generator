import { type RenderTarget, targetKey } from '../preview-targets';
import type { LayerHit, MapBaseLayerId } from '../types';

export interface MapSize {
  width: number;
  height: number;
}

export type TileReporter = (x: number, y: number, width: number, height: number) => void;

/** Raster layers sample numbers; vector layers sample named elements. */
export type LayerSample = number | LayerHit;

export function isLayerHit(sample: LayerSample | undefined): sample is LayerHit {
  return typeof sample === 'object' && sample !== null;
}

export interface LayerRenderStatistics {
  durationMs: number;
  tiles: number;
  pixels: number;
  /** Element counts a vector layer reports instead of a raster resolution. */
  nodes?: number;
  edges?: number;
}

/** Output tile of the preview buffer, in canvas pixels. */
export interface LayerTile {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Longest side of the whole-map fallback surface, in pixels. */
const OVERVIEW_MAX_PX = 512;

export abstract class MapLayer {
  /** Stable surface with the last completed frame; only `commit` writes here. */
  readonly canvas = document.createElement('canvas');
  /** Render buffer for the frame in flight; visible only through progressive tiles. */
  readonly stage = document.createElement('canvas');
  /** Whole-map fallback drawn under the sharp frame while the view outruns it. */
  readonly overview = document.createElement('canvas');
  protected overviewSurfaceTarget?: RenderTarget;
  private committedTarget?: RenderTarget;
  private preparation?: Promise<void>;
  private preparationSignal?: AbortSignal;
  private preparationKey?: string;
  private preparing = false;
  private activeTarget?: RenderTarget;
  private disposed = false;
  statistics?: LayerRenderStatistics;

  protected constructor(
    readonly id: MapBaseLayerId,
    readonly size: MapSize
  ) {}

  /** Whether a render is currently writing into this layer's stage buffer. */
  get busy(): boolean {
    return this.preparing;
  }

  /** A disposed layer owns no surfaces and must not be drawn any more. */
  get isDisposed(): boolean {
    return this.disposed;
  }

  /** Target of the render in flight, or undefined when the layer is idle. */
  get renderingTarget(): RenderTarget | undefined {
    return this.preparing ? this.activeTarget : undefined;
  }

  /** Projection of the whole-map fallback, or undefined before the first render. */
  get overviewTarget(): RenderTarget | undefined {
    return this.overviewSurfaceTarget;
  }

  get renderedTarget(): RenderTarget | undefined {
    return this.committedTarget;
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

  /** Extra numbers reported next to the render cost, e.g. vector element counts. */
  protected statisticsDetails(): Partial<LayerRenderStatistics> {
    return {};
  }

  /**
   * Paints one frame into the stage buffer. Raster layers draw tiles of
   * pixels; vector layers draw paths straight onto the canvas.
   */
  protected abstract renderFrame(
    signal: AbortSignal,
    target: RenderTarget,
    context: CanvasRenderingContext2D,
    onTile?: TileReporter
  ): void | Promise<void>;

  /** Paints the whole map once into the small fallback surface. */
  protected abstract renderOverview(signal: AbortSignal): void;

  /** Target of the whole-map fallback, or undefined for an empty map. */
  protected fallbackTarget(): RenderTarget | undefined {
    const { width, height } = this.size;
    if (width <= 0 || height <= 0) {
      return undefined;
    }
    const cellSize = OVERVIEW_MAX_PX / Math.max(width, height);
    return {
      width: Math.max(1, Math.round(width * cellSize)),
      height: Math.max(1, Math.round(height * cellSize)),
      projection: { cellSize, left: 0, top: 0, width: width * cellSize, height: height * cellSize },
    };
  }

  /** Sizes a surface to the target and returns its 2D context. */
  protected surfaceContext(
    canvas: HTMLCanvasElement,
    target: RenderTarget
  ): CanvasRenderingContext2D {
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas is not available.');
    }
    canvas.width = target.width;
    canvas.height = target.height;
    return context;
  }

  /** Accumulates the cost of one drawn tile or frame. */
  protected addFrameStatistics(durationMs: number, tiles: number, pixels: number): void {
    const statistics = this.statistics;
    if (!statistics) {
      return;
    }
    statistics.durationMs += durationMs;
    statistics.tiles += tiles;
    statistics.pixels += pixels;
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
    this.disposed = true;
    this.canvas.width = this.canvas.height = 0;
    this.stage.width = this.stage.height = 0;
    this.overview.width = this.overview.height = 0;
    this.overviewSurfaceTarget = undefined;
    this.committedTarget = undefined;
    this.preparation = undefined;
    this.preparationSignal = undefined;
    this.preparationKey = undefined;
    this.preparing = false;
    this.activeTarget = undefined;
  }

  /**
   * Raw sample at a source cell: the raster value for raster layers, the named
   * element for vector layers. Undefined outside the layer's valid area.
   */
  abstract sample(x: number, y: number): LayerSample | undefined;

  private async render(
    signal: AbortSignal,
    target: RenderTarget,
    onTile?: TileReporter
  ): Promise<void> {
    signal.throwIfAborted();
    this.renderOverview(signal);
    const startedAt = performance.now();
    const context = this.surfaceContext(this.stage, target);
    const statistics: LayerRenderStatistics = {
      durationMs: performance.now() - startedAt,
      tiles: 0,
      pixels: 0,
      ...this.statisticsDetails(),
    };
    this.statistics = statistics;
    await this.renderFrame(signal, target, context, onTile);
    signal.throwIfAborted();
    const commitStartedAt = performance.now();
    this.commit(target);
    statistics.durationMs += performance.now() - commitStartedAt;
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
    this.committedTarget = target;
  }
}
