import type { MapBaseLayerId, MapRasters } from './types';

describe('catalog-derived types', () => {
  it('derives raster IDs and source types from the catalog', () => {
    expectTypeOf<MapBaseLayerId>().toEqualTypeOf<
      'world-shape' | 'macro-region' | 'heat-zones' | 'moisture' | 'geology' | 'heightmap'
    >();
    expectTypeOf<MapRasters['worldMask']>().toEqualTypeOf<Uint8Array | undefined>();
    expectTypeOf<MapRasters['macroRegionIdMap']>().toEqualTypeOf<Uint8Array | undefined>();
    expectTypeOf<MapRasters['heatZoneMap']>().toEqualTypeOf<Int16Array | undefined>();
    expectTypeOf<MapRasters['moistureBaseMap']>().toEqualTypeOf<Float32Array | undefined>();
    expectTypeOf<MapRasters['oceanCurrentMap']>().toEqualTypeOf<Float32Array | undefined>();
    expectTypeOf<MapRasters['oceanCurrentStrength']>().toEqualTypeOf<Float32Array | undefined>();
    expectTypeOf<MapRasters['heightmap']>().toEqualTypeOf<Float32Array | undefined>();
  });
});
