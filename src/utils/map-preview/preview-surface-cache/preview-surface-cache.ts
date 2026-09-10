import type { MapBaseLayerId } from '../types';

export class PreviewSurfaceCache {
  private revision = 0;
  private readonly surfaces = new Map<MapBaseLayerId, HTMLCanvasElement>();

  useRevision(revision: number): void {
    if (this.revision !== revision) {
      this.revision = revision;
      this.surfaces.clear();
    }
  }

  get(layer: MapBaseLayerId): HTMLCanvasElement | undefined {
    return this.surfaces.get(layer);
  }

  set(layer: MapBaseLayerId, surface: HTMLCanvasElement): void {
    this.surfaces.set(layer, surface);
  }

  has(layer: MapBaseLayerId): boolean {
    return this.surfaces.has(layer);
  }
}

export const persistentPreviewSurfaceCache = new PreviewSurfaceCache();
