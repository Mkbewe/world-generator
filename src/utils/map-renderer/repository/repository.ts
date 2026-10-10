import type { MapSize } from '../layer';
import type { MapInfo, MapMetadata, MapRasters } from '../types';

/**
 * Version of the generated map data contract. A snapshot from another version
 * is dropped with its regeneration baseline instead of being migrated.
 */
export const DATA_CONTRACT_VERSION = 5;

export interface GeneratedMapSnapshot extends MapSize, MapMetadata {
  /** Data contract the snapshot was generated with. */
  contractVersion: number;
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
