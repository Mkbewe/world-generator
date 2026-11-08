import { moistureReadout } from './moisture.readout';
import type { RasterReadoutInspection, ReadoutContext } from '../contracts';

const context: ReadoutContext = { info: {}, options: {} };

function inspection(value?: number): RasterReadoutInspection {
  return { kind: 'raster', layerId: 'moisture', labelKey: 'layers.moisture', value };
}

describe('moistureReadout', () => {
  it('shows the moisture value as a percentage', () => {
    expect(moistureReadout.read(inspection(0.42), context)).toEqual([
      { id: 'moisture', labelKey: 'readout.moisture', value: '42%' },
    ]);
  });

  it('leaves an unavailable sample to the default item', () => {
    expect(moistureReadout.read(inspection(), context)).toBeUndefined();
  });
});
