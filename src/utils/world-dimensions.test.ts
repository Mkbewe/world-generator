import {
  cellCenterMeters,
  cellOriginMeters,
  dimensionsFromMeters,
  metersPerSample,
  metersToCell,
  metersToNormalized,
  normalizedToCell,
  normalizedToMeters,
  SAMPLE_BUDGET,
  validateDimensions,
  type WorldDimensions,
} from './world-dimensions';

const square: WorldDimensions = {
  widthMeters: 4000,
  heightMeters: 4000,
  sampleWidth: 2000,
  sampleHeight: 2000,
};

describe('dimensionsFromMeters', () => {
  it('derives integer sample counts from meters and detail', () => {
    expect(
      dimensionsFromMeters({ widthMeters: 4000, heightMeters: 2000, metersPerSample: 2 })
    ).toEqual({ widthMeters: 4000, heightMeters: 2000, sampleWidth: 2000, sampleHeight: 1000 });
  });

  it('keeps at least one sample per axis', () => {
    expect(dimensionsFromMeters({ widthMeters: 1, heightMeters: 1, metersPerSample: 8 })).toEqual({
      widthMeters: 1,
      heightMeters: 1,
      sampleWidth: 1,
      sampleHeight: 1,
    });
  });

  it('rejects non-positive size and detail', () => {
    expect(() =>
      dimensionsFromMeters({ widthMeters: 0, heightMeters: 10, metersPerSample: 1 })
    ).toThrow('positive number');
    expect(() =>
      dimensionsFromMeters({ widthMeters: 10, heightMeters: 10, metersPerSample: 0 })
    ).toThrow('positive number');
  });
});

describe('validateDimensions', () => {
  it('accepts dimensions within the sample budget', () => {
    expect(() => validateDimensions(square)).not.toThrow();
  });

  it('rejects non-integer samples and over-budget grids', () => {
    expect(() => validateDimensions({ ...square, sampleWidth: 0 })).toThrow('positive integer');
    expect(() => validateDimensions({ ...square, sampleWidth: 1.5 })).toThrow('positive integer');
    expect(() =>
      validateDimensions({
        widthMeters: 4000,
        heightMeters: 4000,
        sampleWidth: 12_000,
        sampleHeight: 12_000,
      })
    ).toThrow(`budget of ${SAMPLE_BUDGET} cells`);
  });
});

describe('metersPerSample', () => {
  it('reports meters per cell for both axes', () => {
    expect(metersPerSample(square)).toEqual({ x: 2, y: 2 });
    expect(
      metersPerSample({
        widthMeters: 4000,
        heightMeters: 1000,
        sampleWidth: 2000,
        sampleHeight: 1000,
      })
    ).toEqual({ x: 2, y: 1 });
  });
});

describe('metersToCell', () => {
  it('maps meters to the containing cell and clamps to the raster', () => {
    expect(metersToCell(square, 0, 0)).toEqual({ x: 0, y: 0 });
    expect(metersToCell(square, 1999, 3999)).toEqual({ x: 999, y: 1999 });
    expect(metersToCell(square, -50, 9999)).toEqual({ x: 0, y: 1999 });
  });

  it('returns a cell whose center is within one cell of the point', () => {
    const point = { xMeters: 1234, yMeters: 3210 };
    const cell = metersToCell(square, point.xMeters, point.yMeters);
    const center = cellCenterMeters(square, cell.x, cell.y);

    expect(Math.abs(center.xMeters - point.xMeters)).toBeLessThanOrEqual(2);
    expect(Math.abs(center.yMeters - point.yMeters)).toBeLessThanOrEqual(2);
  });
});

describe('cellOriginMeters', () => {
  it('maps cell indices to the start of the cell in meters', () => {
    expect(cellOriginMeters(square, 0, 0)).toEqual({ xMeters: 0, yMeters: 0 });
    expect(cellOriginMeters(square, 50, 25)).toEqual({ xMeters: 100, yMeters: 50 });
    expect(cellOriginMeters(square, 1999, 1999)).toEqual({ xMeters: 3998, yMeters: 3998 });
  });

  it('uses meters per sample per axis', () => {
    const wide: WorldDimensions = {
      widthMeters: 4000,
      heightMeters: 1000,
      sampleWidth: 2000,
      sampleHeight: 1000,
    };

    expect(cellOriginMeters(wide, 3, 4)).toEqual({ xMeters: 6, yMeters: 4 });
  });
});

describe('normalized conversions', () => {
  it('round-trips meters through normalized coordinates', () => {
    const normalized = metersToNormalized(square, 1000, 3000);

    expect(normalized).toEqual({ u: 0.25, v: 0.75 });
    expect(normalizedToMeters(square, normalized.u, normalized.v)).toEqual({
      xMeters: 1000,
      yMeters: 3000,
    });
  });

  it('clamps out-of-range normalized values', () => {
    expect(metersToNormalized(square, -100, 5000)).toEqual({ u: 0, v: 1 });
    expect(normalizedToCell(square, 0.5, 0.5)).toEqual({ x: 1000, y: 1000 });
    expect(normalizedToCell(square, -1, 2)).toEqual({ x: 0, y: 1999 });
  });
});
