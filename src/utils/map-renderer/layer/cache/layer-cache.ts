import type { MapBaseLayerId } from '../../types';
import { MapLayer } from '../layer';

interface CacheEntry {
  inputs: readonly unknown[];
  layer: MapLayer;
}

/** Caches one layer per ID, comparing all immutable inputs supplied by the scene. */
export class LayerCache {
  private readonly layers = new Map<MapBaseLayerId, CacheEntry>();

  getOrCreate(id: MapBaseLayerId, inputs: readonly unknown[], create: () => MapLayer): MapLayer {
    const cached = this.layers.get(id);
    if (cached) {
      assertCachedLayer(cached.layer, id);
    }
    if (
      cached &&
      cached.inputs.length === inputs.length &&
      cached.inputs.every((input, index) => input === inputs[index])
    ) {
      return cached.layer;
    }
    const layer = create();
    cached?.layer.dispose();
    this.layers.set(id, { inputs: [...inputs], layer });
    return layer;
  }

  /** Disposes and forgets a layer owned by this cache. */
  evict(layer: MapLayer): void {
    const cached = this.layers.get(layer.id);
    if (cached?.layer !== layer) {
      return;
    }
    cached.layer.dispose();
    this.layers.delete(layer.id);
  }
}

function assertCachedLayer(value: unknown, id: MapBaseLayerId): asserts value is MapLayer {
  if (!(value instanceof MapLayer) || value.id !== id) {
    throw new Error(`Layer cache entry "${id}" is not a valid map layer.`);
  }
}

export const layerCache = new LayerCache();
