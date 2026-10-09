import { SAMPLE_BUDGET } from './world-dimensions';
import { BYTES_PER_SAMPLE, summarizeWorldGrid } from './world-grid';

const BUDGET_SIDE = Math.floor(Math.sqrt(SAMPLE_BUDGET));

describe('summarizeWorldGrid', () => {
  it('derives the sample grid and the estimated memory', () => {
    const grid = summarizeWorldGrid(3000, 2);

    expect(grid.dimensions).toEqual({
      widthMeters: 3000,
      heightMeters: 3000,
      sampleWidth: 1500,
      sampleHeight: 1500,
    });
    expect(grid.metersPerSample).toBe(2);
    expect(grid.samples).toBe(2_250_000);
    expect(grid.memoryBytes).toBe(2_250_000 * BYTES_PER_SAMPLE);
    expect(grid.clamped).toBe(false);
  });

  it('rounds the sample count for fractional detail', () => {
    const grid = summarizeWorldGrid(3000, 0.75);

    expect(grid.dimensions.sampleWidth).toBe(4000);
    expect(grid.metersPerSample).toBeCloseTo(3000 / 4000);
    expect(grid.clamped).toBe(false);
  });

  it('keeps the small preset at the finest detail within the budget', () => {
    const grid = summarizeWorldGrid(3000, 1);

    expect(grid.dimensions.sampleWidth).toBe(3000);
    expect(grid.dimensions.sampleHeight).toBe(3000);
    expect(grid.samples).toBe(9_000_000);
    expect(grid.clamped).toBe(false);
  });

  it('keeps the coarse detail steps of the big preset within the budget', () => {
    for (const metersPerSample of [4, 8, 16]) {
      const grid = summarizeWorldGrid(12_000, metersPerSample);
      expect(grid.metersPerSample).toBe(metersPerSample);
      expect(grid.clamped).toBe(false);
    }
  });

  it('clamps the finest detail of the big preset to the shared budget', () => {
    const grid = summarizeWorldGrid(12_000, 1);

    expect(grid.dimensions.sampleWidth).toBe(BUDGET_SIDE);
    expect(grid.dimensions.sampleHeight).toBe(BUDGET_SIDE);
    expect(grid.samples).toBe(BUDGET_SIDE * BUDGET_SIDE);
    expect(grid.metersPerSample).toBeCloseTo(12_000 / BUDGET_SIDE);
    expect(grid.clamped).toBe(true);
  });

  it('clamps oversized grids to the shared sample budget', () => {
    const grid = summarizeWorldGrid(12_000, 0.5);

    expect(grid.dimensions.sampleWidth).toBe(BUDGET_SIDE);
    expect(grid.dimensions.sampleHeight).toBe(BUDGET_SIDE);
    expect(grid.samples).toBe(BUDGET_SIDE * BUDGET_SIDE);
    expect(grid.clamped).toBe(true);
  });
});
