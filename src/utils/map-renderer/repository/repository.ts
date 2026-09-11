import type { MapSize } from '../layer';
import type { MapLayers } from '../types';

export interface GeneratedMapSnapshot extends MapSize {
  layers: MapLayers;
  seed: string;
  shape: 'disc' | 'rectangle';
  size: number;
}

let snapshot: GeneratedMapSnapshot | undefined;

export function clearGeneratedMap(): void {
  snapshot = undefined;
}

export function getGeneratedMapSnapshot(): GeneratedMapSnapshot | undefined {
  return snapshot;
}

export function cacheGeneratedMap(value: GeneratedMapSnapshot): GeneratedMapSnapshot {
  snapshot = value;
  return snapshot;
}
