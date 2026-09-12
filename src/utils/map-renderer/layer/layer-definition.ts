import { type MapLayer, type MapSize, NoiseLayer, WorldShapeLayer } from './layer';
import type { MapBaseLayerId, SpatialMask } from '../types';

export interface LayerBuildContext {
  size: MapSize;
  built: ReadonlyMap<MapBaseLayerId, MapLayer>;
}

export interface LayerDefinition {
  readonly label: string;
  readonly source: string;
  readonly requires?: readonly MapBaseLayerId[];
  /** Validates the raw data and builds its visual representation. */
  build(context: LayerBuildContext, value: unknown): MapLayer;
  /** Raw data saved under this definition's source key. */
  read(layer: MapLayer): unknown;
  /** Spatial data available to overlays, if this layer provides a mask. */
  mask?(layer: MapLayer): SpatialMask;
}

export const LAYER_DEFINITIONS = {
  'world-shape': {
    label: 'World shape',
    source: 'worldMask',
    build: ({ size }, value) => {
      if (!(value instanceof Uint8Array)) {
        throw new Error('Invalid world mask.');
      }
      if (value.length !== size.width * size.height) {
        throw new Error('Invalid "world-shape" data size.');
      }
      return new WorldShapeLayer(size, value);
    },
    read: layer => (layer as WorldShapeLayer).mask,
    mask: layer => layer as WorldShapeLayer,
  },
  noise: {
    label: 'Noise',
    source: 'noiseMap',
    requires: ['world-shape'],
    build: ({ size, built }, value) => {
      if (!(value instanceof Float32Array)) {
        throw new Error('Invalid noise map.');
      }
      if (value.length !== size.width * size.height) {
        throw new Error('Invalid "noise" data size.');
      }
      return new NoiseLayer(built.get('world-shape') as WorldShapeLayer, value);
    },
    read: layer => (layer as NoiseLayer).noise,
  },
} as const satisfies Readonly<Record<string, LayerDefinition>>;
