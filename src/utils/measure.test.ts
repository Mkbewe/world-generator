import { roundDistance } from './measure';

describe('roundDistance', () => {
  it('snaps down to the largest 1/2/5 × 10^k value', () => {
    expect(roundDistance(280.6)).toBe(200);
    expect(roundDistance(153.06)).toBe(100);
    expect(roundDistance(50)).toBe(50);
    expect(roundDistance(1000)).toBe(1000);
    expect(roundDistance(0.3)).toBe(0.2);
    expect(roundDistance(1)).toBe(1);
  });
});
