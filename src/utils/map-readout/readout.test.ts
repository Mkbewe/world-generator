import { READOUT_DEFINITIONS } from './sources/manifest';
import type { InspectorReadout, Measurement, ReadoutInfo, ReadoutItem } from './contracts';
import { createReadoutRenderer } from './readout';
import { createReadoutRegistry } from './registry';

const readoutItems = createReadoutRenderer(createReadoutRegistry(READOUT_DEFINITIONS));

function readout(inspection?: InspectorReadout['inspection']): InspectorReadout {
  return {
    position: { x: 50, y: 25, u: 0.505, v: 0.255 },
    inspection,
  };
}

function item(
  readoutValue: InspectorReadout | undefined,
  id: string,
  info: ReadoutInfo = {}
): ReadoutItem | undefined {
  return readoutItems(readoutValue, info).find(readoutItem => readoutItem.id === id);
}

describe('readoutItems', () => {
  it('shows placeholders without a readout', () => {
    expect(readoutItems(undefined).map(value => value.value)).toEqual(['—', '—']);
  });

  it('shows every visible overlay value in one detached group', () => {
    const items = readoutItems(
      {
        ...readout(),
        overlays: [
          { overlayId: 'heat-zones', value: 'Cold' },
          { overlayId: 'moisture', value: '42%' },
        ],
      },
      {}
    );

    expect(items).toContainEqual({
      id: 'overlays',
      labelKey: 'readout.overlays',
      value: '',
      heading: true,
      detached: true,
    });
    expect(items.filter(entry => entry.id.startsWith('overlay-'))).toEqual([
      { id: 'overlay-heat-zones', labelKey: 'overlays.heat-zones', value: 'Cold' },
      { id: 'overlay-moisture', labelKey: 'overlays.moisture', value: '42%' },
    ]);
  });

  it('shows the ocean current of an overlay through the shared formatter', () => {
    const items = readoutItems(
      {
        ...readout(),
        overlays: [
          { overlayId: 'ocean-currents', oceanCurrent: { angle: Math.PI / 4, strength: 0.43 } },
        ],
      },
      {}
    );

    expect(items).toContainEqual({
      id: 'overlay-ocean-currents',
      labelKey: 'overlays.ocean-currents',
      value: {
        key: 'readout.oceanCurrentValue',
        params: { strength: 43, direction: { key: 'directions.southeast' } },
      },
    });
  });

  it('falls back to a plain value item for an unknown raster layer', () => {
    const inspection = {
      kind: 'raster',
      layerId: 'unknown',
      labelKey: 'layers.moisture',
      value: 0.5,
    } as const;

    expect(item(readout(inspection), 'value')).toMatchObject({
      labelKey: 'readout.value',
      value: '—',
    });
  });

  it('falls back to the hit name for an unknown vector layer', () => {
    const inspection = {
      kind: 'vector',
      layerId: 'unknown',
      labelKey: 'layers.geology',
      hit: { id: 'element-1' },
    } as const;

    expect(item(readout(inspection), 'name')).toMatchObject({
      labelKey: 'readout.name',
      value: 'element-1',
    });
  });

  it('shows cell coordinates as an X/Y row without a distance', () => {
    const items = readoutItems(readout());

    expect(items[0]).toMatchObject({
      id: 'position',
      labelKey: 'readout.position',
      lines: [{ labelKey: 'readout.position', x: 'X 50 cell', y: 'Y 25 cell' }],
    });
    expect(items.map(value => value.value).join(' ')).not.toContain('%');
  });

  it('adds cell origin and measured distances through the shared spatial port', () => {
    const info = {
      worldDimensions: {
        widthMeters: 4000,
        heightMeters: 2000,
        sampleWidth: 2000,
        sampleHeight: 1000,
      },
    };
    const measurement: Measurement = {
      points: [
        { x: 0, y: 0, u: 0, v: 0 },
        { x: 0, y: 0, u: 0.5, v: 0.5 },
      ],
    };

    expect(item(readout(), 'position', info)?.lines).toEqual([
      { labelKey: 'readout.position', x: 'X 50 cell', y: 'Y 25 cell' },
      { x: 'X 100 m', y: 'Y 50 m' },
    ]);
    expect(item(readout(), 'distance', info)).toBeUndefined();
    const measured = readoutItems(readout(), info, measurement).find(
      entry => entry.id === 'distance'
    );
    expect(measured).toMatchObject({
      labelKey: 'readout.distance',
      value: '2.24 km',
      separated: true,
    });
  });

  it('drops action entries when actions are disabled', () => {
    const inspection = {
      kind: 'vector',
      layerId: 'geology',
      labelKey: 'layers.geology',
      hit: { id: 'region-2' },
    } as const;
    const info: ReadoutInfo = {
      geologyPlan: {
        regions: [{ id: 'region-2', type: 'lagoon', areaSquareMeters: 2_000_000 }],
        worldAreaSquareMeters: 10_000_000,
      },
    };

    const withActions = readoutItems(readout(inspection), info);
    const withoutActions = readoutItems(readout(inspection), info, undefined, { actions: false });

    expect(withActions.find(entry => entry.id === 'edit-region')).toBeDefined();
    expect(withoutActions.find(entry => entry.id === 'edit-region')).toBeUndefined();
    expect(withoutActions.find(entry => entry.id === 'region')).toBeDefined();
  });
});
