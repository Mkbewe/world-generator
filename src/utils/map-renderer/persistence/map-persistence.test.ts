import { MapPersistence } from './map-persistence';
import { MapRepository } from '../repository';

describe('MapPersistence', () => {
  it('saves supplied map data and metadata without a renderer', () => {
    const repository = new MapRepository();
    const persistence = new MapPersistence(repository);
    const layers = {
      worldMask: new Uint8Array(6).fill(1),
      noiseMap: new Float32Array(6),
      islandMask: new Uint16Array(6),
    };

    const saved = persistence.save({
      width: 2,
      height: 3,
      seed: '7',
      shape: 'rectangle',
      layers,
    });

    expect(saved).toEqual({ width: 2, height: 3, seed: '7', shape: 'rectangle', layers });
    expect(saved.layers).toBe(layers);
    expect(repository.get()).toBe(saved);
  });
});
