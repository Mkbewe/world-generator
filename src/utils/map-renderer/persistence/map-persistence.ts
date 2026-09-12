import type { MapRenderer } from '../renderer';
import { type GeneratedMapSnapshot, type MapRepository, mapRepository } from '../repository';

/** Saves map data and restores saved data into a preview. */
export class MapPersistence {
  constructor(private readonly repository: MapRepository = mapRepository) {}

  restore(renderer: MapRenderer): void {
    const snapshot = this.repository.get();
    if (snapshot) {
      renderer.load(snapshot, snapshot.layers);
    }
  }

  save(snapshot: GeneratedMapSnapshot): GeneratedMapSnapshot {
    this.repository.save(snapshot);
    return snapshot;
  }
}

export const mapPersistence = new MapPersistence();
