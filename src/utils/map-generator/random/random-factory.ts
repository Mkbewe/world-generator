import { SeededRandom } from './seeded-random';

export class RandomFactory {
  constructor(private readonly worldSeed: number) {
    if (!Number.isFinite(worldSeed)) {
      throw new RangeError('World seed must be a finite number.');
    }
  }

  create(namespace: string): SeededRandom {
    if (!namespace) {
      throw new RangeError('Random stream namespace must not be empty.');
    }

    return new SeededRandom(this.deriveSeed(namespace));
  }

  private deriveSeed(namespace: string): number {
    const input = `${this.worldSeed}:${namespace}`;
    let hash = 0x811c9dc5;

    for (let index = 0; index < input.length; index++) {
      hash ^= input.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }

    return hash >>> 0;
  }
}
