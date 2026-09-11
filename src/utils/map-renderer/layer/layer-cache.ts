import { type MapLayer, type MapSize, NoiseLayer, WorldShapeLayer } from './layer';
import type { MapBaseLayerId } from '../types';

export class LayerCache {
  private readonly layers = new Map<MapBaseLayerId, MapLayer>();

  world(size: MapSize, mask: Uint8Array): WorldShapeLayer {
    const cached = this.layers.get('world-shape');
    if (cached instanceof WorldShapeLayer && cached.mask === mask) {
      return cached;
    }
    return this.store(new WorldShapeLayer(size, mask));
  }

  noise(world: WorldShapeLayer, noise: Float32Array): NoiseLayer {
    const cached = this.layers.get('noise');
    if (cached instanceof NoiseLayer && cached.noise === noise) {
      return cached;
    }
    return this.store(new NoiseLayer(world, noise));
  }

  private store<T extends MapLayer>(layer: T): T {
    this.layers.get(layer.id)?.dispose();
    this.layers.set(layer.id, layer);
    return layer;
  }
}

export const layerCache = new LayerCache();
