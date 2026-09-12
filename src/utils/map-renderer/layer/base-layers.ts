import { layerRegistry } from './layer-registry';
import type { MapBaseLayerId, MapLayers } from '../types';

export function isBaseLayerId(value: string): value is MapBaseLayerId {
  return layerRegistry.has(value);
}

export function sourceOf(id: MapBaseLayerId): string {
  return layerRegistry.get(id).source;
}

/** Last defined layer whose data is present; the natural default to display. */
export function lastPresentLayer(layers: MapLayers): MapBaseLayerId | undefined {
  return layerRegistry.presentIn(layers).at(-1);
}

export function hasAllBaseLayers(layers: MapLayers): boolean {
  return layerRegistry.presentIn(layers).length === layerRegistry.ids.length;
}
