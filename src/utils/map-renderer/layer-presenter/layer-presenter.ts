import type { WorldShape } from '../../world-shape';
import type { MapLayer } from '../layer';
import type { RenderMetrics } from '../metrics';
import { type RenderTarget, targetKey } from '../preview-targets';
import { traceWorldBoundary } from '../world-boundary-renderer/world-boundary-renderer';

/**
 * Draws the displayed layer and schedules re-renders for the current target.
 *
 * The overview and last complete frame cover gaps while finished stage tiles
 * are composited progressively in the current view. A frame in flight is never
 * aborted: aborting on every pointer sample starves catch-up during gestures,
 * so a changed target only schedules one follow-up render and intermediate
 * targets are collapsed.
 */
export class LayerPresenter {
  private renderedTargets = new WeakMap<MapLayer, RenderTarget>();
  private viewRender?: { controller: AbortController; target: RenderTarget };
  private renderTask?: Promise<void>;
  private renderPending = false;
  private current?: MapLayer;
  private hasBase = false;
  private fallbackClipped = false;
  private shape?: WorldShape;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly metrics: RenderMetrics,
    private readonly target: () => RenderTarget | undefined,
    private readonly view: () => RenderTarget | undefined
  ) {}

  setShape(shape: WorldShape): void {
    this.shape = shape;
  }

  /** Completes when the displayed layer has caught up with the current target. */
  get ready(): Promise<void> {
    return this.waitForRender();
  }

  /** Records that a layer's surface was just prepared for the given target. */
  markRendered(layer: MapLayer, target: RenderTarget): void {
    this.renderedTargets.set(layer, target);
  }

  /** Makes the layer the displayed one and draws it for the current view. */
  show(layer: MapLayer): void {
    if (this.current !== layer) {
      this.hasBase = false;
      this.fallbackClipped = false;
    }
    this.current = layer;
    this.draw();
  }

  /** Rebuilds the view from the overview, complete frame and finished stage tiles. */
  draw(): void {
    const layer = this.current;
    if (!layer) {
      return;
    }
    const view = this.view();
    if (!view) {
      return;
    }
    const overview = layer.overviewTarget;
    const rendered = this.renderedTargets.get(layer) ?? layer.renderedTarget;
    const rendering = layer.renderingTarget;
    const target = this.target();
    const currentFrame = rendered && target && targetKey(rendered) === targetKey(target);
    const useOverview = !currentFrame && overview;
    if (!useOverview && !rendered && !rendering) {
      return;
    }
    this.metrics.present(() => {
      const context = this.canvas.getContext('2d');
      if (!context) {
        throw new Error('Canvas is not available.');
      }
      const { width, height } = this.canvas;
      context.clearRect(0, 0, width, height);
      const clipped = Boolean(useOverview && this.clipWorld(context, view, layer));
      if (useOverview) {
        this.drawSurface(context, layer.overview, useOverview, view, true);
      }
      if (rendered) {
        const smooth = view.projection.cellSize <= rendered.projection.cellSize;
        this.drawSurface(context, layer.canvas, rendered, view, smooth);
      }
      if (rendering) {
        const smooth = view.projection.cellSize <= rendering.projection.cellSize;
        this.drawSurface(context, layer.stage, rendering, view, smooth);
      }
      if (clipped) {
        context.restore();
      }
      this.fallbackClipped = clipped;
    });
    this.hasBase = true;
  }

  /** Copies one completed tile without rebuilding the entire presentation. */
  tileReady(layer: MapLayer, x: number, y: number, width: number, height: number): void {
    if (this.current !== layer) {
      return;
    }
    if (!this.hasBase) {
      this.draw();
      this.metrics.tileDrawn();
      return;
    }
    const render = layer.renderingTarget;
    const view = this.view();
    if (!render || !view) {
      return;
    }
    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas is not available.');
    }
    const scale = view.projection.cellSize / render.projection.cellSize;
    const offsetX = view.projection.left - render.projection.left * scale;
    const offsetY = view.projection.top - render.projection.top * scale;
    if (this.fallbackClipped) {
      this.clipWorld(context, view, layer);
    }
    context.imageSmoothingEnabled = view.projection.cellSize <= render.projection.cellSize;
    context.drawImage(
      layer.stage,
      x,
      y,
      width,
      height,
      offsetX + x * scale,
      offsetY + y * scale,
      width * scale,
      height * scale
    );
    if (this.fallbackClipped) {
      context.restore();
    }
    this.metrics.tileDrawn();
  }

  /**
   * Finishes an in-flight frame before catching up with the latest view.
   * Intermediate targets collapse into a single follow-up render.
   */
  ensure(layer: MapLayer): void {
    const target = this.target();
    if (!target) {
      return;
    }
    const render = this.viewRender;
    if (render) {
      if (targetKey(render.target) !== targetKey(target)) {
        this.renderPending = true;
      }
      return;
    }
    const rendered = this.renderedTargets.get(layer) ?? layer.renderedTarget;
    if (rendered && targetKey(rendered) === targetKey(target)) {
      return;
    }
    if (layer.busy) {
      // The generation queue owns this render; wait for it instead of racing it.
      this.renderPending = true;
      return;
    }
    const controller = new AbortController();
    this.viewRender = { controller, target };
    this.renderTask = layer
      .prepare(controller.signal, target, (x, y, width, height) =>
        this.tileReady(layer, x, y, width, height)
      )
      .then(() => {
        if (controller.signal.aborted) {
          return;
        }
        this.renderedTargets.set(layer, target);
        if (this.current === layer) {
          this.draw();
        }
      })
      .catch(() => {})
      .finally(() => {
        if (this.viewRender?.controller !== controller) {
          return;
        }
        this.viewRender = undefined;
        if (this.renderPending) {
          this.renderPending = false;
          const next = this.current;
          if (next) {
            this.ensure(next);
          }
        }
      });
  }

  reset(): void {
    this.viewRender?.controller.abort();
    this.viewRender = undefined;
    this.renderPending = false;
    this.hasBase = false;
    this.fallbackClipped = false;
    this.shape = undefined;
    this.renderTask = undefined;
    this.renderedTargets = new WeakMap();
    this.current = undefined;
  }

  /** Draws a surface rendered under its own projection into the current view. */
  private drawSurface(
    context: CanvasRenderingContext2D,
    surface: HTMLCanvasElement,
    source: RenderTarget,
    view: RenderTarget,
    smooth: boolean
  ): void {
    const scale = view.projection.cellSize / source.projection.cellSize;
    const offsetX = view.projection.left - source.projection.left * scale;
    const offsetY = view.projection.top - source.projection.top * scale;
    context.imageSmoothingEnabled = smooth;
    context.drawImage(
      surface,
      0,
      0,
      surface.width,
      surface.height,
      offsetX,
      offsetY,
      surface.width * scale,
      surface.height * scale
    );
  }

  private clipWorld(
    context: CanvasRenderingContext2D,
    view: RenderTarget,
    layer: MapLayer
  ): boolean {
    if (!this.shape) {
      return false;
    }
    context.save();
    context.beginPath();
    traceWorldBoundary(context, view.projection, layer.size, this.shape);
    context.clip();
    return true;
  }

  private async waitForRender(): Promise<void> {
    while (this.viewRender) {
      await this.renderTask;
    }
  }
}
