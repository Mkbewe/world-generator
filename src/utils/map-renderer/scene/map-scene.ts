import { type LayerDataRecord, type MapRasters, selectRasters } from '../../map-layers';
import {
  CatalogLayer,
  type LayerCache,
  type LayerRegistry,
  layerRegistry,
  type MapLayer,
  type MapSize,
} from '../layer';
import type { MapBaseLayerId, MapLayerOption, SpatialMask } from '../types';

/** Owns the current map's layers and readiness; scheduling and drawing belong to the renderer. */
export class MapScene {
  private currentSize?: MapSize;
  private readonly layers = new Map<MapBaseLayerId, CatalogLayer>();
  private readonly available = new Set<MapBaseLayerId>();

  constructor(
    private readonly cache: LayerCache,
    private readonly registry: LayerRegistry = layerRegistry
  ) {}

  get size(): MapSize {
    if (!this.currentSize) {
      throw new Error('Map scene has not been started.');
    }
    return this.currentSize;
  }

  get options(): readonly MapLayerOption<MapBaseLayerId>[] {
    return this.registry.order.map(id => ({
      id,
      label: this.registry.get(id).label,
      available: this.available.has(id),
    }));
  }

  start(size: MapSize): void {
    this.reset();
    this.currentSize = size;
  }

  add(id: MapBaseLayerId, value: unknown): MapLayer {
    const size = this.size;
    const spec = this.registry.get(id);
    if (this.layers.has(id)) {
      throw new Error(`Layer "${id}" already received.`);
    }
    const clipMask = spec.clipTo ? this.layers.get(spec.clipTo) : undefined;
    if (spec.clipTo && !clipMask) {
      throw new Error(`Layer "${id}" requires "${spec.clipTo}".`);
    }
    const layer = this.cache.getOrCreate(
      id,
      [spec, value, size.width, size.height, clipMask],
      () => new CatalogLayer(spec, size, value, clipMask)
    );
    this.layers.set(id, layer);
    return layer;
  }

  get(id: MapBaseLayerId): MapLayer | undefined {
    return this.layers.get(id);
  }

  load(data: MapRasters): readonly MapLayer[] {
    const values: LayerDataRecord = data;
    return this.registry
      .presentIn(values)
      .map(id => this.add(id, values[this.registry.get(id).source]));
  }

  readyLayer(id: MapBaseLayerId): MapLayer | undefined {
    return this.available.has(id) ? this.layers.get(id) : undefined;
  }

  markReady(layer: MapLayer): void {
    if (this.layers.get(layer.id) === layer) {
      this.available.add(layer.id);
    }
  }

  /** Removes a failed layer; the cache owns disposal of its image. */
  discard(layer: MapLayer): void {
    if (this.layers.get(layer.id) !== layer) {
      return;
    }
    this.layers.delete(layer.id);
    this.available.delete(layer.id);
    this.cache.evict(layer);
  }

  values(): IterableIterator<MapLayer> {
    return this.layers.values();
  }

  get masks(): ReadonlyMap<MapBaseLayerId, SpatialMask> {
    const masks = new Map<MapBaseLayerId, SpatialMask>();
    for (const [id, layer] of this.layers) {
      if (this.registry.get(id).providesMask) {
        masks.set(id, layer);
      }
    }
    return masks;
  }

  /** Completeness of received data, independent of rendering progress. */
  isComplete(): boolean {
    return this.registry.order.every(id => this.layers.has(id));
  }

  getLayers(): MapRasters {
    return selectRasters(
      Object.fromEntries(
        [...this.layers.values()].map(layer => {
          const spec = this.registry.get(layer.id);
          return [spec.source, layer.data];
        })
      )
    );
  }

  reset(): void {
    this.currentSize = undefined;
    this.layers.clear();
    this.available.clear();
  }
}
