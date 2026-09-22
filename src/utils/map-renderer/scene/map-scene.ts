import { DEFAULT_REGION_NOISE_SOURCE } from '../../map-generator/stages/macro-region-defaults';
import { createRegionDisplacement } from '../../map-generator/stages/macro-region-displacement';
import { createMacroRegionSampler } from '../../map-generator/stages/macro-region-stage';
import {
  type LayerDataRecord,
  type LayerSpec,
  type MapRasters,
  selectRasters,
} from '../../map-layers';
import type { WorldShape } from '../../world-shape';
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
  private shape?: WorldShape;
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
    this.shape = metadata?.shape;
    this.regionConfig = metadata?.regionGeometry;
    this.rebuildGeometry();
  }

  /** Rebuilds the continuous geometry shared by generation and screen-space painting. */
  private rebuildGeometry(): void {
    const size = this.currentSize;
    if (!this.shape || !size) {
      this.geometry = undefined;
      return;
    }
    this.geometry = {
      shape: this.shape,
      regionAt: this.createRegionAt(this.regionConfig, size),
    };
  }

  private createRegionAt(
    region: MapMetadata['regionGeometry'],
    size: MapSize
  ): ((x: number, y: number) => number) | undefined {
    if (!region) {
      return undefined;
    }
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
            ? (cellX, cellY) => this.noiseLayer()?.sample(cellX, cellY)
            : undefined,
      })
    );
  }

  /** Catalog layer that carries the shared noise raster, when the catalog has one. */
  private noiseLayer(): CatalogLayer | undefined {
    const id = this.registry.order.find(
      layerId => this.registry.get(layerId).source === 'noiseMap'
    );
    return id ? this.layers.get(id) : undefined;
  }

  /** Adds or refreshes a layer; repeated data replaces the previous layer. */
  add(id: MapBaseLayerId, value: unknown): MapLayer {
    const size = this.size;
    const spec = this.registry.get(id);
    const missing = this.missingDependency(spec);
    if (missing) {
      throw new Error(`Layer "${id}" requires "${missing}".`);
    }
    const clipMask = spec.clipTo ? this.layers.get(spec.clipTo) : undefined;
    const layer = this.cache.getOrCreate(
      id,
      [
        spec,
        value,
        size.width,
        size.height,
        clipMask,
        this.geometry?.shape,
        spec.boundarySource === 'region' ? this.regionConfig : undefined,
        ...this.sampledRasters(spec),
      ],
      () => new CatalogLayer(spec, size, value, clipMask, this.geometry)
    );
    this.layers.set(id, layer);
    // A refreshed layer becomes ready again once it is presented.
    this.available.delete(id);
    return layer;
  }

  /** First declared dependency this layer still misses, if any. */
  private missingDependency(spec: LayerSpec<MapBaseLayerId>): MapBaseLayerId | undefined {
    const clip = spec.clipTo ? [spec.clipTo] : [];
    return [...clip, ...this.sampledLayers(spec)].find(id => !this.layers.has(id));
  }

  /** Rasters of the sampled layers, in the order the spec declares them. */
  private sampledRasters(spec: LayerSpec<MapBaseLayerId>): readonly unknown[] {
    return this.sampledLayers(spec).map(id => this.layers.get(id)?.data);
  }

  /**
   * Declared samples the current map reads. Region borders sample the noise
   * raster only while the deformation uses the noise map.
   */
  private sampledLayers(spec: LayerSpec<MapBaseLayerId>): readonly MapBaseLayerId[] {
    const samples = spec.samples ?? [];
    return this.regionConfig?.deformation.source === 'noise-map' ? samples : [];
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
    this.shape = undefined;
    this.regionConfig = undefined;
    this.layers.clear();
    this.available.clear();
  }
}
