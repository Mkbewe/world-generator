import {
  cellOriginMeters,
  dimensionsFromMeters,
  isWorldDimensions,
  metersPerSample,
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

describe('isWorldDimensions', () => {
  it('accepts finite positive dimensions with a positive sample grid', () => {
    expect(isWorldDimensions(square)).toBe(true);
  });

  it('rejects malformed captured dimensions', () => {
    expect(isWorldDimensions(undefined)).toBe(false);
    expect(isWorldDimensions('nope')).toBe(false);
    expect(isWorldDimensions({ ...square, widthMeters: 0 })).toBe(false);
    expect(isWorldDimensions({ ...square, sampleWidth: 0 })).toBe(false);
    expect(isWorldDimensions({ ...square, sampleHeight: Number.NaN })).toBe(false);
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
        sampleWidth: 13_000,
        sampleHeight: 13_000,
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
