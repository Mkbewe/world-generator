import { DEFAULT_REGION_NOISE_SOURCE } from '../../map-generator/stages/macro-region-defaults';
import { createRegionDisplacement } from '../../map-generator/stages/macro-region-displacement';
import { createMacroRegionSampler } from '../../map-generator/stages/macro-region-stage';
import { type LayerDataRecord, type MapRasters, selectRasters } from '../../map-layers';
import {
  CatalogLayer,
  type LayerCache,
  type LayerRegistry,
  layerRegistry,
  type MapLayer,
  type MapSize,
} from '../layer';
import type { SmoothGeometry } from '../layer/smooth-geometry';
import type { MapBaseLayerId, MapLayerOption, MapMetadata, SpatialMask } from '../types';

/** Owns the current map's layers and readiness; scheduling and drawing belong to the renderer. */
export class MapScene {
  private currentSize?: MapSize;
  private geometry?: SmoothGeometry;
  private regionConfig?: MapMetadata['regionGeometry'];
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

  /**
   * Begins a map. Layers from a previous run survive while the sample grid
   * keeps its size, so a selective run replaces only its dirty layers.
   */
  start(size: MapSize, metadata?: Pick<MapMetadata, 'shape' | 'regionGeometry'>): void {
    if (!this.matchesSize(size)) {
      this.reset();
    }
    this.currentSize = size;
    this.setMetadata(metadata);
  }

  private matchesSize(size: MapSize): boolean {
    return this.currentSize?.width === size.width && this.currentSize.height === size.height;
  }

  /** Updates the shape and region geometry without touching received layers. */
  private setMetadata(metadata?: Pick<MapMetadata, 'shape' | 'regionGeometry'>): void {
    if (!metadata) {
      this.regionConfig = undefined;
      this.geometry = undefined;
      return;
    }

    const region = metadata.regionGeometry;
    this.regionConfig = region;
    this.geometry = { shape: metadata.shape, regionAt: this.createRegionAt(region) };
  }

  private createRegionAt(
    region: MapMetadata['regionGeometry']
  ): ((x: number, y: number) => number) | undefined {
    if (!region) {
      return undefined;
    }
    const size = this.size;
    return createMacroRegionSampler(
      region.regions,
      region.deformation,
      createRegionDisplacement({
        source: region.deformation.source ?? DEFAULT_REGION_NOISE_SOURCE,
        seed: region.seed,
        width: size.width,
        height: size.height,
        noiseAt:
          region.deformation.source === 'noise-map'
            ? (cellX, cellY) => this.layers.get('noise')?.sample(cellX, cellY)
            : undefined,
      })
    );
  }

  /** Adds or refreshes a layer; repeated data replaces the previous layer. */
  add(id: MapBaseLayerId, value: unknown): MapLayer {
    const size = this.size;
    const spec = this.registry.get(id);
    const clipMask = spec.clipTo ? this.layers.get(spec.clipTo) : undefined;
    if (spec.clipTo && !clipMask) {
      throw new Error(`Layer "${id}" requires "${spec.clipTo}".`);
    }
    if (
      id === 'macro-region' &&
      this.regionConfig?.deformation.source === 'noise-map' &&
      !this.layers.has('noise')
    ) {
      throw new Error('A noise layer is required for noise-map region borders.');
    }
    const layer = this.cache.getOrCreate(
      id,
      [
        spec,
        value,
        size.width,
        size.height,
        clipMask,
        this.geometry?.shape,
        this.regionConfig,
        id === 'macro-region' && this.regionConfig?.deformation.source === 'noise-map'
          ? this.layers.get('noise')?.data
          : undefined,
      ],
      () => new CatalogLayer(spec, size, value, clipMask, this.geometry)
    );
    this.layers.set(id, layer);
    // A refreshed layer becomes ready again once it is presented.
    this.available.delete(id);
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
    this.geometry = undefined;
    this.regionConfig = undefined;
    this.layers.clear();
    this.available.clear();
  }
}
