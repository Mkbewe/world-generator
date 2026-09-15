import type { MapSize } from '../layer';
import type { MapInfo, MapMetadata, MapRasters } from '../types';

export interface GeneratedMapSnapshot extends MapSize, MapMetadata {
  layers: MapRasters;
  /** Non-raster information captured with the map, e.g. macro region labels. */
  info?: MapInfo;
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
