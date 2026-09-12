import { BASE_LAYER_IDS, BASE_LAYERS, type MapBaseLayerId, type MapLayers } from './types';

export function isBaseLayerId(value: string): value is MapBaseLayerId {
  return value in BASE_LAYERS;
}

export function sourceOf(id: MapBaseLayerId): keyof MapLayers {
  return BASE_LAYERS[id].source;
}

/** Last defined layer whose data is present; the natural default to display. */
export function lastPresentLayer(layers: MapLayers): MapBaseLayerId | undefined {
  for (const id of [...BASE_LAYER_IDS].reverse()) {
    if (layers[sourceOf(id)]) {
      return id;
    }
  }
  return undefined;
}

export function hasAllBaseLayers(layers: MapLayers): boolean {
  return BASE_LAYER_IDS.every(id => Boolean(layers[sourceOf(id)]));
}
