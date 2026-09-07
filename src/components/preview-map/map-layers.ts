export type MapBaseLayerId = 'world-shape' | 'noise';
export type MapOverlayId = 'world-boundary' | 'temperature' | 'moisture';

export interface PreviewMapLayers {
  worldMask?: Uint8Array;
  noiseMap?: Float32Array;
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

export function isBaseLayerAvailable(layerId: MapBaseLayerId, layers: PreviewMapLayers): boolean {
  return layerId === 'world-shape' ? Boolean(layers.worldMask) : Boolean(layers.noiseMap);
}

export function isOverlayAvailable(layerId: MapOverlayId, layers: PreviewMapLayers): boolean {
  return layerId === 'world-boundary' ? Boolean(layers.worldMask) : false;
}
