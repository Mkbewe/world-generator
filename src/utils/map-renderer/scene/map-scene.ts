import { createMacroRegionClassifier } from '../../map-generator/stages/macro-region';
import {
  type LayerDataRecord,
  type LayerSpec,
  type MapInfo,
  type MapRasters,
  type RasterLayerSpec,
  selectRasters,
  type VectorLayerSpec,
} from '../../map-layers';
import type { WorldShape } from '../../world-shape';
import {
  CatalogLayer,
  type LayerCache,
  type LayerRegistry,
  layerRegistry,
  type MapLayer,
  type MapSize,
  validateVectorLayerFactories,
  vectorLayerFactories,
  type VectorLayerFactory,
  type VectorLayerFactoryRegistry,
} from '../layer';
import type { SmoothGeometry } from '../layer/smooth-geometry';
import type { MapBaseLayerId, MapLayerOption, MapMetadata, SpatialMask } from '../types';

/** Owns the current map's layers and readiness; scheduling and drawing belong to the renderer. */
export class MapScene {
  private currentSize?: MapSize;
  private geometry?: SmoothGeometry;
  private shape?: WorldShape;
  private regionConfig?: MapMetadata['regionGeometry'];
  private dimensionsMeters?: MapMetadata['dimensionsMeters'];
  private info: MapInfo = {};
  private readonly layers = new Map<MapBaseLayerId, MapLayer>();
  private readonly available = new Set<MapBaseLayerId>();

  constructor(
    private readonly cache: LayerCache,
    private readonly registry: LayerRegistry = layerRegistry,
    private readonly vectorLayers: VectorLayerFactoryRegistry = vectorLayerFactories
  ) {
    validateVectorLayerFactories(registry, vectorLayers);
  }

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
  start(
    size: MapSize,
    metadata?: Pick<MapMetadata, 'shape' | 'regionGeometry' | 'dimensionsMeters'>
  ): void {
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
  private setMetadata(
    metadata?: Pick<MapMetadata, 'shape' | 'regionGeometry' | 'dimensionsMeters'>
  ): void {
    this.shape = metadata?.shape;
    this.regionConfig = metadata?.regionGeometry;
    this.dimensionsMeters = metadata?.dimensionsMeters;
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
    return createMacroRegionClassifier({
      seed: region.seed,
      regions: region.regions,
      deformation: region.deformation,
      width: size.width,
      height: size.height,
      noiseAt: (cellX, cellY) => {
        const sample = this.noiseLayer()?.sample(cellX, cellY);
        return typeof sample === 'number' ? sample : undefined;
      },
    });
  }

  /**
   * Keeps domain data the vector layers carry, e.g. the landmass layout, so a
   * restored map shows them without re-running the generator.
   */
  setInfo(info: MapInfo): readonly MapLayer[] {
    this.info = info;
    return this.applyVectorLayers();
  }

  /** Adds every vector layer whose domain data is present and whose mask is loaded. */
  private applyVectorLayers(): readonly MapLayer[] {
    const added: MapLayer[] = [];
    for (const id of this.registry.order) {
      const spec = this.registry.get(id);
      if (spec.kind !== 'vector') {
        continue;
      }
      const factory = this.vectorLayers.get(id);
      const value = this.info[spec.source];
      if (!factory || value === undefined || !factory.supports(value)) {
        continue;
      }
      // A vector layer waits for its mask, e.g. a restored map without rasters.
      if (this.missingDependency(spec)) {
        continue;
      }
      const previous = this.layers.get(id);
      const layer = this.addVector(spec, factory, value);
      if (layer !== previous) {
        added.push(layer);
      }
    }
    return added;
  }

  /** Catalog layer that carries the shared noise raster, when the catalog has one. */
  private noiseLayer(): MapLayer | undefined {
    const id = this.registry.order.find(
      layerId => this.registry.get(layerId).source === 'noiseMap'
    );
    return id ? this.layers.get(id) : undefined;
  }

  /**
   * Adds or refreshes a layer; repeated data replaces the previous layer. The
   * result starts with the requested layer and continues with every vector
   * layer this data unlocked, so the renderer can schedule them all.
   */
  add(id: MapBaseLayerId, value: unknown): readonly [MapLayer, ...MapLayer[]] {
    const spec = this.registry.get(id);
    const missing = this.missingDependency(spec);
    if (missing) {
      throw new Error(`Layer "${id}" requires "${missing}".`);
    }

    if (spec.kind === 'vector') {
      const factory = this.vectorLayers.get(id);
      if (!factory) {
        throw new Error(`Layer "${id}" has no vector factory.`);
      }
      if (!factory.supports(value)) {
        throw new Error(`Layer "${id}" received invalid domain data.`);
      }
      return [this.addVector(spec, factory, value)];
    }

    const size = this.size;
    const clipMask = spec.clipTo ? this.rasterLayer(spec.clipTo) : undefined;
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
    // A raster may complete the mask a waiting vector layer needs.
    return [layer, ...this.applyVectorLayers()];
  }

  /** Adds or refreshes the vector layer of one catalog entry. */
  private addVector(
    spec: VectorLayerSpec<MapBaseLayerId>,
    factory: VectorLayerFactory,
    value: unknown
  ): MapLayer {
    const size = this.size;
    const clipMask = spec.clipTo ? this.rasterLayer(spec.clipTo) : undefined;
    const reads = spec.reads ?? [];
    const previous = this.layers.get(spec.id);
    const layer = this.cache.getOrCreate(
      spec.id,
      [
        spec,
        value,
        size.width,
        size.height,
        clipMask,
        this.geometry?.shape,
        this.dimensionsMeters?.widthMeters,
        this.dimensionsMeters?.heightMeters,
        ...reads.map(source => this.info[source]),
      ],
      () =>
        factory.create({
          id: spec.id,
          size,
          value,
          info: this.info,
          mask: clipMask,
          shape: this.geometry?.shape,
          dimensionsMeters: this.dimensionsMeters,
        })
    );
    this.layers.set(spec.id, layer);
    // A refreshed layer becomes ready again once it is presented.
    if (layer !== previous) {
      this.available.delete(spec.id);
    }
    return layer;
  }

  /** First declared dependency this layer still misses, if any. */
  private missingDependency(spec: LayerSpec<MapBaseLayerId>): MapBaseLayerId | undefined {
    const clip = spec.clipTo ? [spec.clipTo] : [];
    const samples = spec.kind === 'raster' ? this.sampledLayers(spec) : [];
    return [...clip, ...samples].find(id => !this.layers.has(id));
  }

  /** Rasters of the sampled layers, in the order the spec declares them. */
  private sampledRasters(spec: RasterLayerSpec<MapBaseLayerId>): readonly unknown[] {
    return this.sampledLayers(spec).map(id => this.rasterLayer(id)?.data);
  }

  /**
   * Declared samples the current map reads. Region borders sample the noise
   * raster only while the deformation uses the noise map.
   */
  private sampledLayers(spec: RasterLayerSpec<MapBaseLayerId>): readonly MapBaseLayerId[] {
    const samples = spec.samples ?? [];
    return this.regionConfig?.deformation.source === 'noise-map' ? samples : [];
  }

  /** Layer that carries a raster, or undefined when it is absent or vector. */
  private rasterLayer(id: MapBaseLayerId): CatalogLayer | undefined {
    const layer = this.layers.get(id);
    return layer instanceof CatalogLayer ? layer : undefined;
  }

  get(id: MapBaseLayerId): MapLayer | undefined {
    return this.layers.get(id);
  }

  load(data: MapRasters): readonly MapLayer[] {
    const values: LayerDataRecord = data;
    // Rasters may complete the mask a vector layer waits for, so each add
    // reports the vector layers it unlocked together with the raster itself.
    return this.registry
      .presentIn(values)
      .flatMap(id => this.add(id, values[this.registry.get(id).source]));
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
      const spec = this.registry.get(id);
      const raster = layer instanceof CatalogLayer ? layer : undefined;
      if (raster && spec.kind === 'raster' && spec.providesMask) {
        masks.set(id, raster);
      }
    }
    return masks;
  }

  /** Completeness of received data, independent of rendering progress. */
  isComplete(): boolean {
    return this.registry.order.every(id => this.layers.has(id));
  }

  getLayers(): MapRasters {
    const values: Record<string, unknown> = {};
    for (const [id, layer] of this.layers) {
      const raster = layer instanceof CatalogLayer ? layer : undefined;
      if (raster) {
        values[this.registry.get(id).source] = raster.data;
      }
    }
    return selectRasters(values);
  }

  reset(): void {
    this.currentSize = undefined;
    this.geometry = undefined;
    this.shape = undefined;
    this.regionConfig = undefined;
    this.dimensionsMeters = undefined;
    this.info = {};
    this.layers.clear();
    this.available.clear();
  }
}
