import {
  LAYER_DEFINITIONS,
  type LayerRenderStatistics,
  type MapLayer,
  type TileReporter,
} from './layer';
import type { MapBaseLayerId, RenderStatistics } from './types';
import type { ViewportSize } from './viewport';

/** Measurements belong to one generation run, independently of the cached images. */
export class RenderMetrics {
  private startedAt?: number;
  private firstTileDurationMs?: number;
  private presentationDurationMs = 0;
  private readonly layers = new Map<MapBaseLayerId, LayerRenderStatistics>();

  constructor(private readonly onReport?: (statistics: RenderStatistics) => void) {}

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

  async prepare(layer: MapLayer, signal: AbortSignal, onTile?: TileReporter): Promise<void> {
    const previous = layer.statistics;
    try {
      await layer.prepare(signal, onTile);
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
    this.onReport({
      elapsedDurationMs: performance.now() - this.startedAt,
      firstTileDurationMs: this.firstTileDurationMs,
      viewport,
      overlayDurationMs,
      presentationDurationMs: this.presentationDurationMs,
      layers: [...layers].map(layer => ({
        id: layer.id,
        name: LAYER_DEFINITIONS[layer.id].label,
        durationMs: this.layers.get(layer.id)?.durationMs ?? 0,
        tiles: this.layers.get(layer.id)?.tiles ?? 0,
        pixels: this.layers.get(layer.id)?.pixels ?? 0,
        bytes: layer.canvas.width * layer.canvas.height * 4,
      })),
    });
  }
}
