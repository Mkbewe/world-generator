import { heightmapReadout } from './heightmap.readout';
import type { RasterReadoutInspection, ReadoutContext } from '../contracts';

const context: ReadoutContext = { info: {}, options: {} };

function inspection(value?: number): RasterReadoutInspection {
  return { kind: 'raster', layerId: 'heightmap', labelKey: 'layers.heightmap', value };
}

describe('heightmapReadout', () => {
  it('describes land and its height', () => {
    expect(heightmapReadout.read(inspection(12.5), context)).toEqual([
      { id: 'surface', labelKey: 'readout.surface', value: { key: 'readout.land' } },
      { id: 'height', labelKey: 'readout.height', value: '12.5 m' },
    ]);
  });

  it('describes water below the sea level', () => {
    expect(heightmapReadout.read(inspection(-8), context)).toEqual([
      { id: 'surface', labelKey: 'readout.surface', value: { key: 'readout.water' } },
      { id: 'height', labelKey: 'readout.height', value: '-8 m' },
    ]);
  });

  it('leaves an unavailable sample to the default item', () => {
    expect(heightmapReadout.read(inspection(), context)).toBeUndefined();
  });
});
