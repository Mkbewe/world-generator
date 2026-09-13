import { type MapLayer, type MapSize, NoiseLayer, WorldShapeLayer } from './layer';
import { MacroRegionLayer } from './macro-region-layer';
import type { MapBaseLayerId, SpatialMask } from '../types';

export interface LayerBuildContext {
  size: MapSize;
  built: ReadonlyMap<MapBaseLayerId, MapLayer>;
}

export interface RasterLayerDefinition {
  readonly label: string;
  readonly source: string;
  readonly requires?: readonly MapBaseLayerId[];
  build(context: LayerBuildContext, value: unknown): MapLayer;
  read(layer: MapLayer): unknown;
  mask?(layer: MapLayer): SpatialMask;
}

export interface LayerGroupDefinition {
  readonly label: string;
  /** Ordered raster children. The first child is selected by default. */
  readonly children: Readonly<Record<string, RasterLayerDefinition>>;
}

/** Groups describe navigation; only leaf definitions produce raster data. */
export type LayerDefinition = RasterLayerDefinition | LayerGroupDefinition;

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
  'macro-region': {
    label: 'Macro regions',
    source: 'macroRegionIdMap',
    requires: ['world-shape'],
    build: ({ size, built }, value) => {
      if (!(value instanceof Uint8Array)) {
        throw new Error('Invalid macro region map.');
      }
      if (value.length !== size.width * size.height) {
        throw new Error('Invalid "macro-region" data size.');
      }
      return new MacroRegionLayer(built.get('world-shape') as WorldShapeLayer, value);
    },
    read: layer => (layer as MacroRegionLayer).regions,
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
