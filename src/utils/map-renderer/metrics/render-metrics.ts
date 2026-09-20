import {
  type LayerRegistry,
  type LayerRenderStatistics,
  type MapLayer,
  type TileReporter,
} from '../layer';
import type { RenderTarget } from '../preview-targets';
import type { MapBaseLayerId, RenderStatistics } from '../types';
import type { ViewportSize } from '../viewport';

/** Measurements belong to one generation run, independently of the cached images. */
export class RenderMetrics {
  private startedAt?: number;
  private firstTileDurationMs?: number;
  private presentationDurationMs = 0;
  private readonly layers = new Map<MapBaseLayerId, LayerRenderStatistics>();

  constructor(
    private readonly registry: LayerRegistry,
    private readonly onReport?: (statistics: RenderStatistics) => void
  ) {}

  start(): void {
    this.reset();
    this.startedAt = performance.now();
  }

  reset(): void {
    this.startedAt = undefined;
    this.firstTileDurationMs = undefined;
    this.presentationDurationMs = 0;
    this.layers.clear();
  }

  async prepare(
    layer: MapLayer,
    signal: AbortSignal,
    target: RenderTarget,
    onTile?: TileReporter
  ): Promise<void> {
    const previous = layer.statistics;
    try {
      await layer.prepare(signal, target, onTile);
    } finally {
      if (!signal.aborted && layer.statistics && layer.statistics !== previous) {
        this.layers.set(layer.id, { ...layer.statistics });
      }
    }
  }

  tileDrawn(): void {
    if (this.firstTileDurationMs === undefined && this.startedAt !== undefined) {
      this.firstTileDurationMs = performance.now() - this.startedAt;
    }
  }

  present(draw: () => void): void {
    const startedAt = performance.now();
    try {
      draw();
    } finally {
      this.presentationDurationMs += performance.now() - startedAt;
    }
  }

  report(layers: Iterable<MapLayer>, overlayDurationMs: number, viewport?: ViewportSize): void {
    if (!this.onReport || this.startedAt === undefined) {
      return;
    }
    const rendered = [...layers];
    this.onReport({
      elapsedDurationMs: performance.now() - this.startedAt,
      firstTileDurationMs: this.firstTileDurationMs,
      viewport,
      overlayDurationMs,
      presentationDurationMs: this.presentationDurationMs,
      bufferBytes: rendered.reduce((total, layer) => total + layer.bufferBytes, 0),
      layers: rendered.map(layer => ({
        id: layer.id,
        name: this.registry.get(layer.id).label,
        durationMs: this.layers.get(layer.id)?.durationMs ?? 0,
        tiles: this.layers.get(layer.id)?.tiles ?? 0,
        pixels: this.layers.get(layer.id)?.pixels ?? 0,
        sourceWidth: layer.size.width,
        sourceHeight: layer.size.height,
        outputWidth: layer.canvas.width,
        outputHeight: layer.canvas.height,
        bytes: layer.bufferBytes,
      })),
    });
  }
}
