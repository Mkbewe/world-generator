import { formatAreaKm2, formatBytes, formatMeters } from './format';

describe('measure formatters', () => {
  it('formats metres and areas without floating point noise', () => {
    expect(formatMeters(1000)).toBe('1,000 m');
    expect(formatMeters(20)).toBe('20 m');
    expect(formatMeters(0.5)).toBe('0.5 m');
    expect(formatMeters(300 / 128)).toBe('2.34 m');
    expect(formatAreaKm2(5_000)).toBe('0.005 km²');
    expect(formatAreaKm2(4_500_000)).toBe('4.5 km²');
  });
});

describe('formatBytes', () => {
  it('formats bytes in decimal units', () => {
    expect(formatBytes(999)).toBe('999 B');
    expect(formatBytes(1000)).toBe('1.0 KB');
    expect(formatBytes(5120)).toBe('5.1 KB');
    expect(formatBytes(6_000_000)).toBe('6 MB');
    expect(formatBytes(256_000_000)).toBe('256 MB');
    expect(formatBytes(384_400_000)).toBe('384 MB');
  });
});
