export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state += 0x6d2b79f5;
    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  nextInteger(min: number, max: number): number {
    if (!Number.isInteger(min) || !Number.isInteger(max) || min > max) {
      throw new RangeError('Random integer bounds must be integers and min must not exceed max.');
    }

    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  chance(probability: number): boolean {
    if (probability < 0 || probability > 1) {
      throw new RangeError('Probability must be between 0 and 1.');
    }

    return this.next() < probability;
  }
}
