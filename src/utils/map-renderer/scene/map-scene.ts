import {
  type LayerCache,
  type LayerRegistry,
  layerRegistry,
  type MapLayer,
  type MapSize,
} from '../layer';
import type { MapBaseLayerId, MapLayerOption, MapLayers, SpatialMask } from '../types';

/** Owns the current map's layers and readiness; scheduling and drawing belong to the renderer. */
export class MapScene {
  private currentSize?: MapSize;
  private readonly layers = new Map<MapBaseLayerId, MapLayer>();
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
    return this.registry.ids.map(id => ({
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
    const definition = this.registry.get(id);
    if (this.layers.has(id)) {
      throw new Error(`Layer "${id}" already received.`);
    }
    const dependencies = (definition.requires ?? []).map(required => {
      const dependency = this.layers.get(required);
      if (!dependency) {
        throw new Error(`Layer "${id}" requires "${required}".`);
      }
      return dependency;
    });
    const layer = this.cache.getOrCreate(
      id,
      [definition, value, size.width, size.height, ...dependencies],
      () => {
        const built = definition.build({ size, built: this.layers }, value);
        if (built.id !== id) {
          built.dispose();
          throw new Error(`Layer "${id}" returned an unexpected ID: "${built.id}".`);
        }
        return built;
      }
    );
    this.layers.set(id, layer);
    return layer;
  }

  get(id: MapBaseLayerId): MapLayer | undefined {
    return this.layers.get(id);
  }

  load(data: MapLayers): readonly MapLayer[] {
    return this.registry
      .presentIn(data)
      .map(id => this.add(id, data[this.registry.get(id).source]));
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
      const mask = this.registry.get(id).mask?.(layer);
      if (mask) {
        masks.set(id, mask);
      }
    }
    return masks;
  }

  /** Completeness of received data, independent of rendering progress. */
  isComplete(): boolean {
    return this.registry.ids.every(id => this.layers.has(id));
  }

  getLayers(): MapLayers {
    return Object.fromEntries(
      [...this.layers.values()].map(layer => {
        const definition = this.registry.get(layer.id);
        return [definition.source, definition.read(layer)];
      })
    );
  }

  reset(): void {
    this.currentSize = undefined;
    this.layers.clear();
    this.available.clear();
  }
}
