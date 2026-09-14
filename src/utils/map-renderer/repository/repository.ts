import type { MapSize } from '../layer';
import type { MapMetadata, MapRasters } from '../types';

export interface GeneratedMapSnapshot extends MapSize, MapMetadata {
  layers: MapRasters;
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
