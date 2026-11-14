import type { WorldSnapshotData } from '../../world-snapshot';

export type GeneratedMapSnapshot = WorldSnapshotData;

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
