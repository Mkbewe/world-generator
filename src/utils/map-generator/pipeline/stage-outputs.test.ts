import {
  isPersistentRasterValue,
  isRasterOutputKey,
  PERSISTENT_RASTER_TYPES,
  RASTER_OUTPUT_KEYS,
  selectPersistentRasters,
} from './stage-outputs';

describe('selectPersistentRasters', () => {
  it('keeps every declared raster output with the right constructor', () => {
    const data = {
      worldMask: new Uint8Array(1),
      noiseMap: new Float32Array(1),
      macroRegionIdMap: new Uint8Array(1),
    };

    const selected = selectPersistentRasters(data);

    expect(Object.keys(selected).sort()).toEqual([...RASTER_OUTPUT_KEYS].sort());
    for (const key of RASTER_OUTPUT_KEYS) {
      expect(selected[key]).toBe(data[key]);
    }
  });

  it('throws on a wrong constructor and drops unknown keys', () => {
    expect(() => selectPersistentRasters({ worldMask: new Float32Array(1) })).toThrow(
      'invalid type'
    );
    expect(selectPersistentRasters({ legacyMap: new Int16Array(1) })).toEqual({});
  });

  it('returns a new record over the shared buffers', () => {
    const data = { noiseMap: new Float32Array(1) };
    const selected = selectPersistentRasters(data);

    expect(selected).not.toBe(data);
    expect(selected.noiseMap).toBe(data.noiseMap);
  });

  it('covers every declared key in the constructor table', () => {
    expect(Object.keys(PERSISTENT_RASTER_TYPES).sort()).toEqual([...RASTER_OUTPUT_KEYS].sort());
  });

  it('names raster keys and validates declared values', () => {
    expect(isRasterOutputKey('noiseMap')).toBe(true);
    expect(isRasterOutputKey('legacyMap')).toBe(false);
    expect(isPersistentRasterValue('noiseMap', new Float32Array(1))).toBe(true);
    expect(isPersistentRasterValue('noiseMap', new Uint8Array(1))).toBe(false);
  });
});
