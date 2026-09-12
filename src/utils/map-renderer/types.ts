import type { MapSize } from './layer';
import type { ViewportSize } from './viewport';

/** Immutable spatial data usable by layers and overlays. */
export interface SpatialMask {
  readonly size: MapSize;
  contains(x: number, y: number): boolean;
}

export interface MapLayers {
  [source: string]: unknown;
  worldMask?: Uint8Array;
  noiseMap?: Float32Array;
  progressionMap?: Float32Array;
  macroRegionIdMap?: Uint8Array;
}

export interface MapMetadata {
  seed: string;
  shape: 'disc' | 'rectangle';
}

export const OVERLAY_LAYERS = {
  'world-boundary': { label: 'World boundary', source: 'world-shape' },
} as const;

/** IDs are supplied and validated by the layer registry. */
export type MapBaseLayerId = string;
export type MapOverlayId = keyof typeof OVERLAY_LAYERS;

/** ID in declaration order, for iteration. */
export const OVERLAY_IDS = Object.keys(OVERLAY_LAYERS) as MapOverlayId[];

export interface MapLayerOption<TId extends string> {
  id: TId;
  label: string;
  available: boolean;
}

export interface MapOverlayOption extends MapLayerOption<MapOverlayId> {
  visible: boolean;
}

export interface RenderLayerStatistics {
  id: MapBaseLayerId;
  name: string;
  /** Synchronous preparation and tile drawing time, excluding browser yields. */
  durationMs: number;
  tiles: number;
  /** Pixels drawn in this run, including transparent pixels. */
  pixels: number;
  bytes: number;
}

export interface RenderStatistics {
  /** Wall-clock time from starting the run to this report, including waiting. */
  elapsedDurationMs: number;
  /** Time from starting the run to the first tile copied to the preview canvas. */
  firstTileDurationMs?: number;
  viewport?: ViewportSize;
  /** Cumulative synchronous overlay work in this run. */
  overlayDurationMs: number;
  /** Cumulative time copying complete layers to the preview canvas. */
  presentationDurationMs: number;
  layers: readonly RenderLayerStatistics[];
}
