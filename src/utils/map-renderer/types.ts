export interface MapLayers {
  worldMask?: Uint8Array;
  noiseMap?: Float32Array;
}

export const BASE_LAYERS = [
  { id: 'world-shape', label: 'World shape', source: 'worldMask' },
  { id: 'noise', label: 'Noise', source: 'noiseMap' },
] as const satisfies readonly { id: string; label: string; source: keyof MapLayers }[];

export const OVERLAY_LAYERS = [{ id: 'world-boundary', label: 'World boundary' }] as const;

export type MapBaseLayerId = (typeof BASE_LAYERS)[number]['id'];
export type MapOverlayId = (typeof OVERLAY_LAYERS)[number]['id'];

export interface MapLayerOption<TId extends string> {
  id: TId;
  label: string;
  available: boolean;
}

export interface MapOverlayOption extends MapLayerOption<MapOverlayId> {
  visible: boolean;
}

export function isBaseLayerId(value: string): value is MapBaseLayerId {
  return BASE_LAYERS.some(layer => layer.id === value);
}

export function sourceOf(id: MapBaseLayerId): keyof MapLayers {
  const layer = BASE_LAYERS.find(entry => entry.id === id);
  if (!layer) {
    throw new Error(`Unknown layer: ${id}`);
  }
  return layer.source;
}

/** Last defined layer whose data is present; the natural default to display. */
export function lastPresentLayer(layers: MapLayers): MapBaseLayerId | undefined {
  for (const layer of [...BASE_LAYERS].reverse()) {
    if (layers[layer.source]) {
      return layer.id;
    }
  }
  return undefined;
}

export function hasAllBaseLayers(layers: MapLayers): boolean {
  return BASE_LAYERS.every(({ source }) => Boolean(layers[source]));
}
