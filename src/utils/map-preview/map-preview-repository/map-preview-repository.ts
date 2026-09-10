import type { MapPreviewSource } from '../types';

export interface GeneratedMapSnapshot extends MapPreviewSource {
  seed: string;
  shape: 'disc' | 'rectangle';
  size: number;
}

let snapshot: GeneratedMapSnapshot | undefined;
let revision = 0;

export function createMapRevision(): number {
  return ++revision;
}

export function getGeneratedMapSnapshot(): GeneratedMapSnapshot | undefined {
  return snapshot;
}

export function cacheGeneratedMap(
  value: Omit<GeneratedMapSnapshot, 'revision'>
): GeneratedMapSnapshot {
  snapshot = { ...value, revision: createMapRevision() };
  return snapshot;
}
