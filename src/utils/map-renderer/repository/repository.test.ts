import { type GeneratedMapSnapshot, MapRepository } from './repository';

function createSnapshot(seed: string): GeneratedMapSnapshot {
  return {
    width: 2,
    height: 2,
    size: 2,
    seed,
    shape: 'disc',
    layers: {
      worldMask: new Uint8Array(4).fill(1),
      noiseMap: new Float32Array(4),
    },
  };
}

describe('MapRepository', () => {
  it('has no snapshot by default', () => {
    expect(new MapRepository().get()).toBeUndefined();
  });

  it('saves the snapshot and returns it by reference', () => {
    const repository = new MapRepository();
    const snapshot = createSnapshot('1');

    repository.save(snapshot);

    expect(repository.get()).toBe(snapshot);
  });

  it('replaces the previous snapshot', () => {
    const repository = new MapRepository();
    repository.save(createSnapshot('1'));
    const next = createSnapshot('2');

    repository.save(next);

    expect(repository.get()).toBe(next);
  });

  it('clears the snapshot', () => {
    const repository = new MapRepository();
    repository.save(createSnapshot('1'));

    repository.clear();

    expect(repository.get()).toBeUndefined();
  });
});
