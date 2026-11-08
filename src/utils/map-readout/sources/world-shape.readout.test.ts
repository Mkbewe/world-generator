import { worldShapeReadout } from './world-shape.readout';
import type { RasterReadoutInspection, ReadoutContext } from '../contracts';

const context: ReadoutContext = { info: {}, options: {} };

function inspection(value?: number): RasterReadoutInspection {
  return { kind: 'raster', layerId: 'world-shape', labelKey: 'layers.worldShape', value };
}

describe('worldShapeReadout', () => {
  it('describes world shape values', () => {
    expect(worldShapeReadout.read(inspection(1), context)).toEqual([
      { id: 'value', labelKey: 'readout.value', value: { key: 'readout.inside' } },
    ]);
    expect(worldShapeReadout.read(inspection(0), context)).toEqual([
      { id: 'value', labelKey: 'readout.value', value: { key: 'readout.outside' } },
    ]);
  });

  it('leaves an unavailable sample to the default item', () => {
    expect(worldShapeReadout.read(inspection(), context)).toBeUndefined();
  });
});
