import type { ViewportSize } from './viewport';

export interface MapLayers {
  worldMask?: Uint8Array;
  noiseMap?: Float32Array;
}

export interface MapMetadata {
  seed: string;
  shape: 'disc' | 'rectangle';
}

export const BASE_LAYERS = {
  'world-shape': { label: 'World shape', source: 'worldMask' },
  noise: { label: 'Noise', source: 'noiseMap' },
} as const satisfies Record<string, { label: string; source: keyof MapLayers }>;

export const OVERLAY_LAYERS = {
  'world-boundary': { label: 'World boundary' },
} as const;

export type MapBaseLayerId = keyof typeof BASE_LAYERS;
export type MapOverlayId = keyof typeof OVERLAY_LAYERS;

/** ID in declaration order, for iteration. */
export const BASE_LAYER_IDS = Object.keys(BASE_LAYERS) as MapBaseLayerId[];
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
  durationMs: number;
  tiles: number;
  bytes: number;
}

export interface RenderStatistics {
  totalDurationMs: number;
  viewport?: ViewportSize;
  overlayDurationMs: number;
  layers: readonly RenderLayerStatistics[];
}
