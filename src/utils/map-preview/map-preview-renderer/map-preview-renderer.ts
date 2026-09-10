import { MapRasterRenderer } from '../map-raster-renderer';
import { persistentPreviewSurfaceCache, type PreviewSurfaceCache } from '../preview-surface-cache';
import { PreviewViewport, type PreviewViewportSize } from '../preview-viewport';
import {
  getLayerLabel,
  isBaseLayerAvailable,
  type MapBaseLayerId,
  type MapOverlayId,
  type MapPreviewRendererOptions,
  type MapPreviewSource,
  type PreviewRenderResult,
  type PreviewRenderStatistics,
} from '../types';
import { WorldBoundaryRenderer } from '../world-boundary-renderer';

interface MapPreviewElements {
  canvas: HTMLCanvasElement;
  overlayCanvas: HTMLCanvasElement;
  viewportElement: HTMLElement;
}

export class MapPreviewRenderer {
  private readonly rasterRenderer = new MapRasterRenderer();
  private readonly boundaryRenderer = new WorldBoundaryRenderer();
  private readonly viewport: PreviewViewport;
  private source?: MapPreviewSource;
  private overlays: readonly MapOverlayId[] = ['world-boundary'];
  private renderVersion = 0;

  constructor(
    private readonly elements: MapPreviewElements,
    private readonly options: MapPreviewRendererOptions = {},
    private readonly cache: PreviewSurfaceCache = persistentPreviewSurfaceCache
  ) {
    this.viewport = new PreviewViewport(elements.viewportElement, () => this.renderOverlays());
    this.viewport.start();
  }

  setSource(source: MapPreviewSource | undefined): void {
    this.source = source;
    this.renderVersion++;
    this.setRenderingState(undefined);
    if (!source || (!source.layers.worldMask && !source.layers.noiseMap)) {
      this.clear();
      return;
    }

    this.cache.useRevision(source.revision);
    this.renderOverlays();
  }

  async showLayer(layer: MapBaseLayerId): Promise<PreviewRenderResult> {
    const startedAt = performance.now();
    const source = this.source;
    const renderVersion = ++this.renderVersion;
    const statistics: PreviewRenderStatistics[] = [];
    let status: PreviewRenderResult['status'] = 'skipped';
    if (!source || !isBaseLayerAvailable(layer, source.layers)) {
      this.setRenderingState(undefined);
    } else {
      try {
        const baseStatistics = await this.renderLayer(source, layer, renderVersion, 'display');
        statistics.push(baseStatistics);
        status = baseStatistics.status;
        if (status === 'completed' && renderVersion === this.renderVersion) {
          this.setRenderingState(undefined);
          const overlayStatistics = this.renderOverlays();
          if (overlayStatistics) {
            statistics.push(overlayStatistics);
          }
          await this.preRenderOtherLayers(source, layer, renderVersion, statistics);
        }
      } finally {
        // A superseded render must not reveal the canvas or reset the newer render's status.
        if (renderVersion === this.renderVersion) {
          this.setRenderingState(undefined);
        }
      }
      status =
        renderVersion !== this.renderVersion
          ? 'cancelled'
          : statistics.some(item => item.status === 'failed')
            ? 'failed'
            : status;
    }

    return {
      layer,
      revision: source?.revision,
      status,
      statistics,
      totalDurationMs: performance.now() - startedAt,
    };
  }

  setOverlays(overlays: readonly MapOverlayId[]): void {
    this.overlays = overlays;
    this.renderOverlays();
  }

  clear(): void {
    this.renderVersion++;
    this.clearCanvas(this.elements.canvas);
    this.clearCanvas(this.elements.overlayCanvas);
    this.elements.canvas.style.visibility = 'visible';
    this.elements.overlayCanvas.style.visibility = 'visible';
    this.options.onRenderingChange?.(undefined);
  }

  dispose(): void {
    this.renderVersion++;
    this.setRenderingState(undefined);
    this.viewport.dispose();
  }

  private async renderLayer(
    source: MapPreviewSource,
    layer: MapBaseLayerId,
    renderVersion: number,
    target: PreviewRenderStatistics['target']
  ): Promise<PreviewRenderStatistics> {
    const startedAt = performance.now();
    let surface = this.cache.get(layer);
    const cacheHit = Boolean(surface);
    let status: PreviewRenderStatistics['status'] = 'completed';
    let error: string | undefined;
    try {
      if (!surface) {
        if (target === 'display') {
          this.setRenderingState(layer);
        }
        surface = this.createSurface(source.width, source.height);
        const rendered = await this.rasterRenderer.render(
          surface,
          source.layers,
          layer,
          () => renderVersion !== this.renderVersion
        );
        if (renderVersion !== this.renderVersion) {
          status = 'cancelled';
        } else if (!rendered) {
          throw new Error('Unable to render the map layer: canvas context is unavailable.');
        } else {
          this.cache.set(layer, surface);
        }
      }
      if (status === 'completed' && target === 'display') {
        this.displaySurface(surface);
      }
    } catch (cause) {
      status = renderVersion !== this.renderVersion ? 'cancelled' : 'failed';
      if (status === 'failed') {
        error = cause instanceof Error ? cause.message : String(cause);
      }
    }
    return this.reportStatistics({
      stageId: 'base-layer',
      stageName: `${getLayerLabel(layer)} rendering`,
      startedAt,
      status,
      revision: source.revision,
      layer,
      target,
      details: { width: source.width, height: source.height, cacheHit },
      ...(error === undefined ? {} : { error }),
    });
  }

  private async preRenderOtherLayers(
    source: MapPreviewSource,
    activeLayer: MapBaseLayerId,
    renderVersion: number,
    statistics: PreviewRenderStatistics[]
  ): Promise<void> {
    const layers: readonly MapBaseLayerId[] = ['world-shape', 'noise'];
    for (const layer of layers) {
      if (renderVersion !== this.renderVersion) {
        return;
      }
      if (
        layer === activeLayer ||
        this.cache.has(layer) ||
        !isBaseLayerAvailable(layer, source.layers)
      ) {
        continue;
      }

      const result = await this.renderLayer(source, layer, renderVersion, 'cache');
      statistics.push(result);
      if (result.status !== 'completed') {
        return;
      }
    }
  }

  private renderOverlays(): PreviewRenderStatistics | undefined {
    const source = this.source;
    const viewport = this.viewport.measure();
    if (!source || !viewport) {
      return;
    }

    const startedAt = performance.now();
    let error: string | undefined;
    try {
      if (!this.renderWorldBoundary(source, viewport)) {
        throw new Error('Unable to render the world boundary: canvas context is unavailable.');
      }
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    }
    return this.reportStatistics({
      stageId: 'world-boundary',
      stageName: 'World boundary rendering',
      startedAt,
      status: error === undefined ? 'completed' : 'failed',
      revision: source.revision,
      layer: 'world-boundary',
      target: 'display',
      details: {
        width: this.elements.overlayCanvas.width,
        height: this.elements.overlayCanvas.height,
        cacheHit: false,
      },
      ...(error === undefined ? {} : { error }),
    });
  }

  private renderWorldBoundary(source: MapPreviewSource, viewport: PreviewViewportSize): boolean {
    return this.boundaryRenderer.render({
      canvas: this.elements.overlayCanvas,
      worldMask: this.overlays.includes('world-boundary') ? source.layers.worldMask : undefined,
      sourceWidth: source.width,
      sourceHeight: source.height,
      displayWidth: viewport.width,
      displayHeight: viewport.height,
      devicePixelRatio: viewport.devicePixelRatio,
    });
  }

  private reportStatistics(
    operation: Omit<PreviewRenderStatistics, 'finishedAt' | 'durationMs'>
  ): PreviewRenderStatistics {
    const finishedAt = performance.now();
    const statistics = { ...operation, finishedAt, durationMs: finishedAt - operation.startedAt };
    this.options.onStatistics?.(statistics);
    return statistics;
  }

  private setRenderingState(layer: MapBaseLayerId | undefined): void {
    this.elements.canvas.style.visibility = layer ? 'hidden' : 'visible';
    this.elements.overlayCanvas.style.visibility = layer ? 'hidden' : 'visible';
    this.options.onRenderingChange?.(layer);
  }

  private displaySurface(surface: HTMLCanvasElement): void {
    const { canvas } = this.elements;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Unable to display the map layer: canvas context is unavailable.');
    }
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(surface, 0, 0);
  }

  private createSurface(width: number, height: number): HTMLCanvasElement {
    const surface = document.createElement('canvas');
    surface.width = width;
    surface.height = height;
    return surface;
  }

  private clearCanvas(canvas: HTMLCanvasElement): void {
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  }
}
