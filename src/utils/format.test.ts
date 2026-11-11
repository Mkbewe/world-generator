import {
  formatAreaKm2,
  formatBytes,
  formatDistance,
  formatDuration,
  formatDurationShort,
  formatMeters,
} from './format';

describe('measure formatters', () => {
  it('formats metres and areas without floating point noise', () => {
    expect(formatMeters(1000)).toBe('1,000 m');
    expect(formatMeters(20)).toBe('20 m');
    expect(formatMeters(0.5)).toBe('0.5 m');
    expect(formatMeters(300 / 128)).toBe('2.34 m');
    expect(formatAreaKm2(5_000)).toBe('0.005 km²');
    expect(formatAreaKm2(4_500_000)).toBe('4.5 km²');
  });

  it('switches distances to kilometres from a thousand metres', () => {
    expect(formatDistance(500)).toBe('500 m');
    expect(formatDistance(999.4)).toBe('999.4 m');
    expect(formatDistance(1000)).toBe('1 km');
    expect(formatDistance(12_500)).toBe('12.5 km');
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

describe('formatDuration', () => {
  it('returns a dash for undefined duration', () => {
    expect(formatDuration(undefined)).toBe('—');
  });

  it('formats milliseconds below one second with one decimal place', () => {
    expect(formatDuration(0)).toBe('0.0 ms');
    expect(formatDuration(12.34)).toBe('12.3 ms');
    expect(formatDuration(999.9)).toBe('999.9 ms');
  });

  it('formats seconds from one second up with two decimal places', () => {
    expect(formatDuration(1000)).toBe('1.00 s');
    expect(formatDuration(1500)).toBe('1.50 s');
    expect(formatDuration(12345)).toBe('12.35 s');
  });
});

describe('formatDurationShort', () => {
  it('formats milliseconds below one second rounded to whole numbers', () => {
    expect(formatDurationShort(0)).toBe('0 ms');
    expect(formatDurationShort(12.3)).toBe('12 ms');
    expect(formatDurationShort(12.7)).toBe('13 ms');
    expect(formatDurationShort(999)).toBe('999 ms');
  });

  it('formats seconds from one second up with one decimal place', () => {
    expect(formatDurationShort(1000)).toBe('1.0 s');
    expect(formatDurationShort(1540)).toBe('1.5 s');
    expect(formatDurationShort(12360)).toBe('12.4 s');
  });
});
