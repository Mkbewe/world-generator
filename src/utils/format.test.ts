import { formatBytes } from './format';

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
