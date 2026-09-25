import type { MapLayer, MapSize } from './layer';
import type { LayerRegistry } from './layer-registry';
import type { WorldShape } from '../../world-shape';
import type { MapBaseLayerId, SpatialMask } from '../types';

/** Everything a factory needs to build the vector layer of one map. */
export interface VectorLayerInput {
  readonly id: MapBaseLayerId;
  readonly size: MapSize;
  readonly value: unknown;
  /** Spatial mask of the layer's clip source, e.g. the world shape. */
  readonly mask?: SpatialMask;
  /** World outline the layer may paint, e.g. an ocean background. */
  readonly shape?: WorldShape;
  /** Physical world size for meter-based clipping; absent on restored maps. */
  readonly dimensionsMeters?: {
    readonly widthMeters: number;
    readonly heightMeters: number;
  };
}

/**
 * Builds the layer behind one vector catalog entry. Domain data crosses the
 * boundary here: `supports` validates it, `create` owns the typed domain type.
 */
export interface VectorLayerFactory {
  readonly id: MapBaseLayerId;
  supports(value: unknown): boolean;
  create(input: VectorLayerInput): MapLayer;
}

/** Factories of the vector layers the renderer can build, keyed by layer ID. */
export type VectorLayerFactoryRegistry = ReadonlyMap<MapBaseLayerId, VectorLayerFactory>;

/**
 * Fails fast when a catalog vector layer has no factory, so a missing layer is
 * a startup error instead of a silent gap in the preview.
 */
export function validateVectorLayerFactories(
  registry: LayerRegistry,
  factories: VectorLayerFactoryRegistry
): void {
  for (const id of registry.order) {
    if (registry.get(id).kind !== 'vector') {
      continue;
    }
    const factory = factories.get(id);
    if (!factory) {
      throw new Error(`Missing vector layer factory: ${id}`);
    }
    if (factory.id !== id) {
      throw new Error(`Vector layer factory "${factory.id}" is registered under "${id}".`);
    }
  }
}
