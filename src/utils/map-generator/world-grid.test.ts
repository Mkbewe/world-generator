import { BYTES_PER_SAMPLE, summarizeWorldGrid } from './world-grid';

describe('summarizeWorldGrid', () => {
  it('derives the sample grid and the estimated memory', () => {
    const grid = summarizeWorldGrid(2000, 2);

    expect(grid.dimensions).toEqual({
      widthMeters: 2000,
      heightMeters: 2000,
      sampleWidth: 1000,
      sampleHeight: 1000,
    });
    expect(grid.metersPerSample).toBe(2);
    expect(grid.samples).toBe(1_000_000);
    expect(grid.memoryBytes).toBe(1_000_000 * BYTES_PER_SAMPLE);
    expect(grid.clamped).toBe(false);
  });

  it('rounds the sample count for fractional detail', () => {
    const grid = summarizeWorldGrid(1000, 0.75);

    expect(grid.dimensions.sampleWidth).toBe(1333);
    expect(grid.metersPerSample).toBeCloseTo(1000 / 1333);
    expect(grid.clamped).toBe(false);
  });

  it('keeps the biggest preset at the finest detail within the budget', () => {
    const grid = summarizeWorldGrid(4000, 0.5);

    expect(grid.dimensions.sampleWidth).toBe(8000);
    expect(grid.dimensions.sampleHeight).toBe(8000);
    expect(grid.samples).toBe(64_000_000);
    expect(grid.clamped).toBe(false);
  });

  it('keeps the largest world at a one meter detail within the budget', () => {
    const grid = summarizeWorldGrid(10_000, 1);

    expect(grid.dimensions.sampleWidth).toBe(10_000);
    expect(grid.dimensions.sampleHeight).toBe(10_000);
    expect(grid.samples).toBe(100_000_000);
    expect(grid.metersPerSample).toBe(1);
    expect(grid.clamped).toBe(false);
  });

  it('clamps oversized grids to the shared sample budget', () => {
    const grid = summarizeWorldGrid(10_000, 0.5);

    expect(grid.dimensions.sampleWidth).toBe(10_000);
    expect(grid.dimensions.sampleHeight).toBe(10_000);
    expect(grid.samples).toBe(100_000_000);
    expect(grid.metersPerSample).toBe(1);
    expect(grid.clamped).toBe(true);
  });
});
