import { BASE_LAYER_IDS, LAYER_DEFINITIONS } from './layer/layer-definition';
import type { MapBaseLayerId, MapLayers } from './types';

export function isBaseLayerId(value: string): value is MapBaseLayerId {
  return Object.hasOwn(LAYER_DEFINITIONS, value);
}

export function sourceOf(id: MapBaseLayerId): keyof MapLayers {
  return LAYER_DEFINITIONS[id].source;
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
