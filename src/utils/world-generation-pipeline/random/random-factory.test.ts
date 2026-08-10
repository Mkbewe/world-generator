import { RandomFactory } from './random-factory';

describe('RandomFactory', () => {
  it('creates repeatable streams for the same world seed and namespace', () => {
    const first = new RandomFactory(123).create('noise');
    const second = new RandomFactory(123).create('noise');

    expect([first.next(), first.next(), first.next()]).toEqual([
      second.next(),
      second.next(),
      second.next(),
    ]);
  });

  it('creates independent streams for different namespaces', () => {
    const factory = new RandomFactory(123);
    const noise = factory.create('noise');
    const resources = factory.create('resources');

    expect(noise.next()).not.toBe(resources.next());
  });

  it('recreating one stream is unaffected by consumption of another stream', () => {
    const factory = new RandomFactory(123);
    const expectedBiomes = factory.create('biomes').next();
    const noise = factory.create('noise');

    for (let index = 0; index < 100; index++) {
      noise.next();
    }

    expect(factory.create('biomes').next()).toBe(expectedBiomes);
  });
});
