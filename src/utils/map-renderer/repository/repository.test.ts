import {
  cacheGeneratedMap,
  clearGeneratedMap,
  type GeneratedMapSnapshot,
  getGeneratedMapSnapshot,
} from './repository';

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

describe('generated map repository', () => {
  beforeEach(() => {
    clearGeneratedMap();
  });

  it('has no snapshot by default', () => {
    expect(getGeneratedMapSnapshot()).toBeUndefined();
  });

  it('caches the snapshot and returns it by reference', () => {
    const value = createSnapshot('1');

    const cached = cacheGeneratedMap(value);

    expect(cached).toBe(value);
    expect(getGeneratedMapSnapshot()).toBe(value);
  });

  it('replaces the previous snapshot', () => {
    cacheGeneratedMap(createSnapshot('1'));
    const next = createSnapshot('2');

    cacheGeneratedMap(next);

    expect(getGeneratedMapSnapshot()).toBe(next);
  });

  it('clears the snapshot', () => {
    cacheGeneratedMap(createSnapshot('1'));

    clearGeneratedMap();

    expect(getGeneratedMapSnapshot()).toBeUndefined();
  });
});
