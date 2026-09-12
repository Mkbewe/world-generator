import type { MapLayer } from './layer';
import type { MapBaseLayerId } from '../types';

interface CacheEntry {
  inputs: readonly unknown[];
  layer: MapLayer;
}

/** Caches one layer per ID, comparing all immutable inputs supplied by the scene. */
export class LayerCache {
  private readonly layers = new Map<MapBaseLayerId, CacheEntry>();

  getOrCreate(id: MapBaseLayerId, inputs: readonly unknown[], create: () => MapLayer): MapLayer {
    const cached = this.layers.get(id);
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
}

export const layerCache = new LayerCache();
