import { type MapLayer, type MapSize, type NoiseLayer, type WorldShapeLayer } from './layer';
import type { LayerCache } from './layer-cache';
import type { MapBaseLayerId, MapLayers } from '../types';

export interface LayerBuildContext {
  size: MapSize;
  cache: LayerCache;
  built: ReadonlyMap<MapBaseLayerId, MapLayer>;
}

export interface LayerDefinition {
  /** Builds the layer from its raw data; may depend on already built layers. */
  build(context: LayerBuildContext, value: unknown): MapLayer;
  /** Writes the layer's raw data into a snapshot. */
  write(target: MapLayers, layer: MapLayer): void;
  /** Optional value range exposed by the layer. */
  range?(layer: MapLayer): { min: number; max: number } | undefined;
  /** Layers that must be built first. */
  requires?: readonly MapBaseLayerId[];
  /** Marks the layer that provides the world boundary outline. */
  boundary?: boolean;
}

export const LAYER_DEFINITIONS: Record<MapBaseLayerId, LayerDefinition> = {
  'world-shape': {
    boundary: true,
    build: ({ size, cache }, value) => {
      if (!(value instanceof Uint8Array)) {
        throw new Error('Invalid world mask.');
      }
      return cache.world(size, value);
    },
    write: (target, layer) => {
      target.worldMask = (layer as WorldShapeLayer).mask;
    },
  },
  noise: {
    requires: ['world-shape'],
    build: ({ cache, built }, value) => {
      if (!(value instanceof Float32Array)) {
        throw new Error('Invalid noise map.');
      }
      return cache.noise(built.get('world-shape') as WorldShapeLayer, value);
    },
    write: (target, layer) => {
      target.noiseMap = (layer as NoiseLayer).noise;
    },
    range: layer => {
      const noise = layer as NoiseLayer;
      return Number.isFinite(noise.min) ? { min: noise.min, max: noise.max } : undefined;
    },
  },
};
