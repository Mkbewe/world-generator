import type { MapSize } from '../layer';
import type { MapLayers, MapMetadata } from '../types';

export interface GeneratedMapSnapshot extends MapSize, MapMetadata {
  layers: MapLayers;
  size: number;
}

export class MapRepository {
  private snapshot?: GeneratedMapSnapshot;

  get(): GeneratedMapSnapshot | undefined {
    return this.snapshot;
  }

  save(snapshot: GeneratedMapSnapshot): void {
    this.snapshot = snapshot;
  }

  clear(): void {
    this.snapshot = undefined;
  }
}

export const mapRepository = new MapRepository();
