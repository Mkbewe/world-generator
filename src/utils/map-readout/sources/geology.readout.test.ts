import { geologyReadout } from './geology.readout';
import type { ReadoutContext, VectorReadoutInspection } from '../contracts';

function context(info: ReadoutContext['info'] = {}): ReadoutContext {
  return { info, options: {} };
}

function inspection(hit?: VectorReadoutInspection['hit']): VectorReadoutInspection {
  return { kind: 'vector', layerId: 'geology', labelKey: 'layers.geology', hit };
}

const info = {
  geologyPlan: {
    regions: [
      {
        id: 'region-2',
        type: 'lagoon',
        areaSquareMeters: 2_000_000,
      },
    ],
    worldAreaSquareMeters: 10_000_000,
  },
};

function item(infoValue: ReadoutContext['info'], id: string) {
  return geologyReadout
    .read(inspection({ id: 'region-2' }), context(infoValue))
    ?.find(entry => entry.id === id);
}

describe('geologyReadout', () => {
  it('shows the region, its type, character, area and edit action', () => {
    expect(item(info, 'region')?.value).toBe('region-2');
    expect(item(info, 'type')?.value).toEqual({ key: 'readout.lagoon' });
    expect(item(info, 'character')?.value).toEqual({ key: 'readout.lagoonDescription' });
    expect(item(info, 'area')?.value).toMatchObject({ key: 'readout.areaShare' });
    expect(item(info, 'edit-region')?.action).toEqual({
      id: 'edit-region',
      labelKey: 'readout.editRegion',
    });
  });

  it('skips the area row when the plan carries no measurements', () => {
    const sparse = {
      geologyPlan: { regions: [{ id: 'region-2', type: 'ordinary' }] },
    };

    expect(item(sparse, 'region')?.value).toBe('region-2');
    expect(item(sparse, 'area')).toBeUndefined();
  });

  it('leaves missing plans, missed hits and unknown regions to the default item', () => {
    expect(geologyReadout.read(inspection(), context(info))).toBeUndefined();
    expect(geologyReadout.read(inspection({ id: 'region-2' }), context({}))).toBeUndefined();
    expect(geologyReadout.read(inspection({ id: 'missing' }), context(info))).toBeUndefined();
  });
});
