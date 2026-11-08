import { oceanCurrentReadout } from './ocean-currents.readout';
import type { ReadoutContext, VectorReadoutInspection } from '../contracts';

const context: ReadoutContext = { info: {}, options: {} };

function inspection(hit?: VectorReadoutInspection['hit']): VectorReadoutInspection {
  return { kind: 'vector', layerId: 'ocean-currents', labelKey: 'layers.oceanCurrents', hit };
}

describe('oceanCurrentReadout', () => {
  it('shows the ocean current under the pointer', () => {
    const items = oceanCurrentReadout.read(
      inspection({ id: 'ocean-current', oceanCurrent: { angle: Math.PI / 4, strength: 0.43 } }),
      context
    );

    expect(items).toEqual([
      {
        id: 'current',
        labelKey: 'readout.oceanCurrent',
        value: {
          key: 'readout.oceanCurrentValue',
          params: { strength: 43, direction: { key: 'directions.southeast' } },
        },
      },
    ]);
  });

  it('reports a calm current', () => {
    expect(
      oceanCurrentReadout.read(
        inspection({ id: 'ocean-current', oceanCurrent: { angle: 0, strength: 0 } }),
        context
      )
    ).toEqual([
      { id: 'current', labelKey: 'readout.oceanCurrent', value: { key: 'readout.calm' } },
    ]);
  });

  it('falls back to the hit label and then to the empty marker', () => {
    expect(
      oceanCurrentReadout.read(inspection({ id: 'a', label: 'Gulf stream' }), context)
    ).toEqual([{ id: 'current', labelKey: 'readout.oceanCurrent', value: 'Gulf stream' }]);
    expect(oceanCurrentReadout.read(inspection({ id: 'a' }), context)).toEqual([
      { id: 'current', labelKey: 'readout.oceanCurrent', value: '—' },
    ]);
  });

  it('leaves a missed pointer to the default item', () => {
    expect(oceanCurrentReadout.read(inspection(), context)).toBeUndefined();
  });
});
