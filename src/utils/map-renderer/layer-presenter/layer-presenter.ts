import type { MapLayer } from '../layer';
import type { RenderMetrics } from '../metrics';
import { type RenderTarget, targetKey } from '../preview-targets';

/**
 * Draws the displayed layer and schedules re-renders for the current target.
 *
 * The presentation never reads a partially rendered buffer: layers commit to a
 * stable surface and the whole-map overview covers the gaps during gestures.
 */
export class LayerPresenter {
  private renderedTargets = new WeakMap<MapLayer, RenderTarget>();
  private viewRender?: AbortController;
  private renderTask?: Promise<void>;
  private renderPending = false;
  private current?: MapLayer;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly metrics: RenderMetrics,
    private readonly target: () => RenderTarget | undefined,
    private readonly view: () => RenderTarget | undefined
  ) {}

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
    this.current = layer;
    this.draw();
  }

  /** Draws the current layer: whole-map overview first, then the last completed frame. */
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
    const rendered = this.renderedTargets.get(layer);
    if (!overview && !rendered) {
      return;
    }
    this.metrics.present(() => {
      const context = this.canvas.getContext('2d');
      if (!context) {
        throw new Error('Canvas is not available.');
      }
      const { width, height } = this.canvas;
      context.clearRect(0, 0, width, height);
      if (overview) {
        this.drawSurface(context, layer.overview, overview, view);
      }
      if (rendered) {
        this.drawSurface(context, layer.canvas, rendered, view);
      }
    });
  }

  /** Renders the layer for the target, replacing an outdated render at once. */
  ensure(layer: MapLayer): void {
    const target = this.target();
    if (!target) {
      return;
    }
    const rendered = this.renderedTargets.get(layer);
    if (rendered && targetKey(rendered) === targetKey(target)) {
      return;
    }
    if (this.viewRender) {
      // Our own frame is already outdated; stop it and restart for the latest view.
      this.renderPending = true;
      this.viewRender.abort();
      return;
    }
    if (layer.busy) {
      // The generation queue owns this render; wait for it instead of racing it.
      this.renderPending = true;
      return;
    }
    const controller = new AbortController();
    this.viewRender = controller;
    this.renderTask = layer
      .prepare(controller.signal, target)
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
        if (this.viewRender !== controller) {
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
    this.viewRender?.abort();
    this.viewRender = undefined;
    this.renderPending = false;
    this.renderTask = undefined;
    this.renderedTargets = new WeakMap();
    this.current = undefined;
  }

  /** Draws a surface rendered under its own projection into the current view. */
  private drawSurface(
    context: CanvasRenderingContext2D,
    surface: HTMLCanvasElement,
    source: RenderTarget,
    view: RenderTarget
  ): void {
    const scale = view.projection.cellSize / source.projection.cellSize;
    const offsetX = view.projection.left - source.projection.left * scale;
    const offsetY = view.projection.top - source.projection.top * scale;
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

  private async waitForRender(): Promise<void> {
    while (this.viewRender) {
      await this.renderTask;
    }
  }
}
