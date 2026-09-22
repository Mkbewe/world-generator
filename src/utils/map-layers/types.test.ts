import type { MapBaseLayerId, MapRasters } from './types';

describe('catalog-derived types', () => {
  it('derives raster IDs and source types from the catalog', () => {
    expectTypeOf<MapBaseLayerId>().toEqualTypeOf<'world-shape' | 'noise' | 'macro-region'>();
    expectTypeOf<MapRasters['worldMask']>().toEqualTypeOf<Uint8Array | undefined>();
    expectTypeOf<MapRasters['macroRegionIdMap']>().toEqualTypeOf<Uint8Array | undefined>();
    expectTypeOf<MapRasters['noiseMap']>().toEqualTypeOf<Float32Array | undefined>();
  });
});
