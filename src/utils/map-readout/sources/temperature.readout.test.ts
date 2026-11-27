import { temperatureReadout } from './temperature.readout';
import type { RasterReadoutInspection, ReadoutContext } from '../contracts';

const context: ReadoutContext = { info: {}, options: {} };

function inspection(value?: number): RasterReadoutInspection {
  return { kind: 'raster', layerId: 'temperature', labelKey: 'layers.temperature', value };
}

describe('temperatureReadout', () => {
  it('shows the normalized temperature as a percentage', () => {
    expect(temperatureReadout.read(inspection(0.42), context)).toEqual([
      { id: 'temperature', labelKey: 'readout.temperature', value: '42%' },
    ]);
  });

  it('leaves an unavailable sample to the default item', () => {
    expect(temperatureReadout.read(inspection(), context)).toBeUndefined();
  });
});
