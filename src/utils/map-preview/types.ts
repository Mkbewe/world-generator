export type MapBaseLayerId = 'world-shape' | 'noise';
export type MapOverlayId = 'world-boundary' | 'temperature' | 'moisture';

export interface PreviewMapLayers {
  worldMask?: Uint8Array;
  noiseMap?: Float32Array;
}

export interface AvailablePreviewMapLayers {
  worldMask?: unknown;
  noiseMap?: unknown;
}

export interface MapPreviewSource {
  width: number;
  height: number;
  revision: number;
  layers: PreviewMapLayers;
}

export interface PreviewRenderStatistics {
  stageId: 'base-layer' | 'world-boundary';
  stageName: string;
  status: 'completed' | 'failed' | 'cancelled';
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  revision: number;
  layer: MapBaseLayerId | MapOverlayId;
  target: 'display' | 'cache';
  details: {
    width: number;
    height: number;
    cacheHit: boolean;
  };
  error?: string;
}

export interface PreviewRenderResult {
  layer: MapBaseLayerId;
  revision?: number;
  status: PreviewRenderStatistics['status'] | 'skipped';
  statistics: readonly PreviewRenderStatistics[];
  /** Wall-clock time, including browser yields and background layer preparation. */
  totalDurationMs: number;
}

export interface MapPreviewRendererOptions {
  onRenderingChange?: (layer: MapBaseLayerId | undefined) => void;
  /** Reports each operation, including standalone overlay redraws after resize/toggle. */
  onStatistics?: (statistics: PreviewRenderStatistics) => void;
}

export interface MapLayerOption<TId extends string> {
  id: TId;
  label: string;
  available: boolean;
}

export const BASE_LAYER_OPTIONS: readonly MapLayerOption<MapBaseLayerId>[] = [
  { id: 'world-shape', label: 'World shape', available: true },
  { id: 'noise', label: 'Noise', available: true },
];

export const OVERLAY_OPTIONS: readonly MapLayerOption<MapOverlayId>[] = [
  { id: 'world-boundary', label: 'World boundary', available: true },
  { id: 'temperature', label: 'Temperature', available: false },
  { id: 'moisture', label: 'Moisture', available: false },
];

export function isBaseLayerAvailable(
  layerId: MapBaseLayerId,
  layers: AvailablePreviewMapLayers
): boolean {
  return layerId === 'world-shape' ? Boolean(layers.worldMask) : Boolean(layers.noiseMap);
}

export function isOverlayAvailable(
  layerId: MapOverlayId,
  layers: AvailablePreviewMapLayers
): boolean {
  return layerId === 'world-boundary' ? Boolean(layers.worldMask) : false;
}

export function getLayerLabel(layer: MapBaseLayerId): string {
  return layer === 'world-shape' ? 'World shape' : 'Noise';
}
