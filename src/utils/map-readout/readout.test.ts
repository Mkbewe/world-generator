import { type InspectorReadout, type Measurement, type ReadoutItem, readoutItems } from './readout';
import type { MapInfo, MapInspection } from '../map-renderer';

function readout(inspection?: MapInspection): InspectorReadout {
  return {
    position: { x: 50, y: 25, u: 0.505, v: 0.255 },
    inspection,
  };
}

function item(
  readoutValue: InspectorReadout | undefined,
  id: string,
  info?: Parameters<typeof readoutItems>[1]
): ReadoutItem | undefined {
  return readoutItems(readoutValue, info).find(readoutItem => readoutItem.id === id);
}

function itemValue(
  readoutValue: InspectorReadout | undefined,
  id: string,
  info?: Parameters<typeof readoutItems>[1]
): string | undefined {
  const entry = item(readoutValue, id, info);
  const value = entry?.value;
  return typeof value === 'string' ? value : value?.key;
}

function itemLabel(
  readoutValue: InspectorReadout | undefined,
  id: string,
  info?: Parameters<typeof readoutItems>[1]
): string | undefined {
  const entry = item(readoutValue, id, info);
  return entry?.labelKey;
}

describe('readoutItems', () => {
  it('shows placeholders without a readout', () => {
    expect(readoutItems(undefined).map(value => value.value)).toEqual(['—', '—']);
  });

  it('shows the heat zone under the pointer when the overlay reports one', () => {
    const items = readoutItems({
      ...readout(),
      overlays: [{ overlayId: 'heat-zones', value: 'Temperate north' }],
    });

    expect(items).toContainEqual({
      id: 'overlays',
      labelKey: 'readout.overlays',
      value: '',
      heading: true,
      detached: true,
    });
    expect(items).toContainEqual({
      id: 'overlay-heat-zones',
      labelKey: 'overlays.heat-zones',
      value: 'Temperate north',
    });
  });

  it('shows every visible overlay value in one detached group', () => {
    const items = readoutItems({
      ...readout(),
      overlays: [
        { overlayId: 'heat-zones', value: 'Cold' },
        { overlayId: 'moisture', value: '42%' },
      ],
    });
    const overlays = items.filter(item => item.id.startsWith('overlay-'));

    expect(items).toContainEqual({
      id: 'overlays',
      labelKey: 'readout.overlays',
      value: '',
      heading: true,
      detached: true,
    });
    expect(overlays).toEqual([
      { id: 'overlay-heat-zones', labelKey: 'overlays.heat-zones', value: 'Cold' },
      { id: 'overlay-moisture', labelKey: 'overlays.moisture', value: '42%' },
    ]);
  });

  it('shows the ocean current under the pointer from the preview layer', () => {
    const inspection: MapInspection = {
      kind: 'vector',
      layerId: 'ocean-currents',
      labelKey: 'layers.oceanCurrents',
      hit: { id: 'ocean-current', oceanCurrent: { angle: Math.PI / 4, strength: 0.43 } },
    };

    expect(item(readout(inspection), 'current')).toEqual({
      id: 'current',
      labelKey: 'readout.oceanCurrent',
      value: {
        key: 'readout.oceanCurrentValue',
        params: { strength: 43, direction: { key: 'directions.southeast' } },
      },
    });
  });

  it('shows the heat zone name and class from the preview layer', () => {
    const inspection: MapInspection = {
      kind: 'raster',
      layerId: 'heat-zones',
      labelKey: 'layers.heatZones',
      value: 1,
    };
    const info: MapInfo = {
      heatZoneInfo: [
        { id: 'cold', label: 'Cold rim', thermal: 'cold' },
        { id: 'warm', label: 'Warm core', thermal: 'warm' },
      ],
    };

    expect(item(readout(inspection), 'zone', info)).toEqual({
      id: 'zone',
      labelKey: 'readout.heatZone',
      value: 'Warm core',
    });
    expect(item(readout(inspection), 'thermal', info)).toEqual({
      id: 'thermal',
      labelKey: 'readout.class',
      value: { key: 'readout.warm' },
    });
    expect(itemValue(readout(inspection), 'thermal', info)).toBe('readout.warm');
  });

  it('shows the moisture value as a percentage', () => {
    const inspection: MapInspection = {
      kind: 'raster',
      layerId: 'moisture',
      labelKey: 'layers.moisture',
      value: 0.42,
    };

    expect(itemValue(readout(inspection), 'moisture')).toBe('42%');
  });

  it('shows cell coordinates as an X/Y row without a distance', () => {
    const items = readoutItems(readout());

    expect(items[0]).toMatchObject({
      id: 'position',
      labelKey: 'readout.position',
      lines: [{ labelKey: 'readout.position', x: 'X 50 cell', y: 'Y 25 cell' }],
    });
    expect(items[1]).toMatchObject({ id: 'value', labelKey: 'readout.value', value: '—' });
    expect(items.map(value => value.value).join(' ')).not.toContain('%');
  });

  it('adds the distance in meters as a second row', () => {
    const info = {
      worldDimensions: {
        widthMeters: 4000,
        heightMeters: 2000,
        sampleWidth: 2000,
        sampleHeight: 1000,
      },
    };

    expect(item(readout(), 'position', info)?.lines).toEqual([
      { labelKey: 'readout.position', x: 'X 50 cell', y: 'Y 25 cell' },
      { x: 'X 100 m', y: 'Y 50 m' },
    ]);
  });

  it('rounds fractional meters to one decimal place', () => {
    const info = {
      worldDimensions: {
        widthMeters: 1000,
        heightMeters: 1000,
        sampleWidth: 300,
        sampleHeight: 300,
      },
    };

    expect(item(readout(), 'position', info)?.lines?.[1]).toEqual({
      x: 'X 166.7 m',
      y: 'Y 83.3 m',
    });
  });

  it('omits the distance row for malformed dimensions', () => {
    const malformed = {
      worldDimensions: { widthMeters: 100, heightMeters: 100, sampleWidth: 0, sampleHeight: 0 },
    };

    expect(item(readout(), 'position', { worldDimensions: 'nope' })?.lines).toEqual([
      { labelKey: 'readout.position', x: 'X 50 cell', y: 'Y 25 cell' },
    ]);
    expect(item(readout(), 'position', malformed)?.lines).toEqual([
      { labelKey: 'readout.position', x: 'X 50 cell', y: 'Y 25 cell' },
    ]);
  });

  it('adds the measured distance in the fitting unit', () => {
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
    const measured = (value: Measurement | undefined, mapInfo: MapInfo = info) =>
      readoutItems(readout(), mapInfo, value).find(entry => entry.id === 'distance');

    expect(measured(measurement)).toMatchObject({
      labelKey: 'readout.distance',
      value: '2.24 km',
      separated: true,
    });
    expect(
      measured({
        points: [
          { x: 0, y: 0, u: 0, v: 0 },
          { x: 0, y: 0, u: 0.05, v: 0 },
        ],
      })?.value
    ).toBe('200 m');
    expect(
      measured({
        points: [
          { x: 0, y: 0, u: 0, v: 0 },
          { x: 0, y: 0, u: 0.5, v: 0 },
          { x: 0, y: 0, u: 0.5, v: 0.5 },
        ],
      })?.value
    ).toBe('3 km');
    expect(measured(measurement, {})).toBeUndefined();
    expect(readoutItems(readout(), info, measurement).map(entry => entry.id)).toEqual([
      'position',
      'distance',
      'value',
    ]);
    expect(readoutItems(readout(), info, measurement)[0]).toMatchObject({ separated: false });
    expect(readoutItems(readout(), info)[0]).toMatchObject({ separated: true });
  });

  it('describes world shape values', () => {
    const inspection = {
      kind: 'raster',
      layerId: 'world-shape',
      labelKey: 'layers.worldShape',
    } as const;

    expect(itemValue(readout({ ...inspection, value: 1 }), 'value')).toBe('readout.inside');
    expect(itemValue(readout({ ...inspection, value: 0 }), 'value')).toBe('readout.outside');
  });

  it('describes macro region ids with their labels', () => {
    expect(
      itemValue(
        readout({
          kind: 'raster',
          layerId: 'macro-region',
          labelKey: 'layers.macroRegions',
          value: 3,
        }),
        'value'
      )
    ).toBe('readout.regionIndex');
  });

  it('shows the macro region range, width, danger and area captured with the map', () => {
    const inspection = {
      kind: 'raster',
      layerId: 'macro-region',
      labelKey: 'layers.macroRegions',
      value: 1,
    } as const;
    const info = {
      macroRegionInfo: [
        { label: 'Safe haven', role: 'base', danger: 0.1, kind: 'ring', range: [0, 0.25] },
        { label: 'Wasteland', role: 'base', danger: 0.9, kind: 'ring', range: [0.25, 0.5] },
      ],
      macroRegionAreas: [2_000_000, 6_000_000],
    };

    expect(itemValue(readout(inspection), 'region', info)).toBe('Wasteland');
    expect(itemLabel(readout(inspection), 'width', info)).toBe('readout.ringThickness');
    expect(itemValue(readout(inspection), 'range', info)).toBe('readout.rangeRing');
    expect(itemValue(readout(inspection), 'width', info)).toBe('50%');
    expect(itemValue(readout(inspection), 'danger', info)).toBe('0.90');
    expect(itemValue(readout(inspection), 'area', info)).toBe('readout.areaShare');
  });

  it('shows an overlay band coverage and its axis range', () => {
    const inspection = {
      kind: 'raster',
      layerId: 'macro-region',
      labelKey: 'layers.macroRegions',
      value: 0,
    } as const;
    const info = {
      macroRegionInfo: [
        { label: 'Crossing', role: 'overlay', danger: 0.5, kind: 'band', range: [0.42, 0.58] },
      ],
    };

    expect(itemLabel(readout(inspection), 'width', info)).toBe('readout.bandWidth');
    expect(itemValue(readout(inspection), 'range', info)).toBe('readout.rangeBand');
    expect(itemValue(readout(inspection), 'width', info)).toBe('16%');
    expect(item(readout(inspection), 'area', info)).toBeUndefined();
  });

  it('falls back to the region number for malformed macro region info', () => {
    const inspection = {
      kind: 'raster',
      layerId: 'macro-region',
      labelKey: 'layers.macroRegions',
      value: 1,
    } as const;

    expect(itemValue(readout(inspection), 'value', { macroRegionInfo: 'nope' })).toBe(
      'readout.regionIndex'
    );
    expect(itemValue(readout(inspection), 'value', { macroRegionInfo: [{ label: 1 }] })).toBe(
      'readout.regionIndex'
    );
  });

  it('keeps the layer label while the raster sample is unavailable', () => {
    const raster = readoutItems(
      readout({ kind: 'raster', layerId: 'world-shape', labelKey: 'layers.worldShape' })
    );

    expect(raster[1]).toMatchObject({ labelKey: 'readout.value', value: '—' });
  });

  it('shows the generated region and its type under the pointer', () => {
    const inspection = {
      kind: 'vector',
      layerId: 'geology',
      labelKey: 'layers.geology',
      hit: { id: 'region-2' },
    } as const;
    const info = {
      geologyPlan: {
        regions: [
          {
            id: 'region-2',
            centre: { x: 0.5, y: 0.5 },
            weight: 1,
            type: 'lagoon',
            areaSquareMeters: 2_000_000,
          },
        ],
        regionRasterSize: { width: 1, height: 1 },
        regionOwnerMap: new Int16Array([0]),
        regionBorderDistanceMap: new Float32Array([500]),
        worldAreaSquareMeters: 10_000_000,
      },
    };

    expect(itemValue(readout(inspection), 'region', info)).toBe('region-2');
    expect(itemValue(readout(inspection), 'type', info)).toBe('readout.lagoon');
    expect(itemValue(readout(inspection), 'character', info)).toBe('readout.lagoonDescription');
    expect(itemValue(readout(inspection), 'area', info)).toBe('readout.areaShare');
    expect(item(readout(inspection), 'edit-region', info)?.action).toEqual({
      id: 'edit-region',
      labelKey: 'readout.editRegion',
    });
  });

  it('drops action entries when actions are disabled', () => {
    const inspection = {
      kind: 'vector',
      layerId: 'geology',
      labelKey: 'layers.geology',
      hit: { id: 'region-2' },
    } as const;
    const info = {
      geologyPlan: {
        regions: [
          {
            id: 'region-2',
            centre: { x: 0.5, y: 0.5 },
            weight: 1,
            type: 'lagoon',
            areaSquareMeters: 2_000_000,
          },
        ],
        regionRasterSize: { width: 1, height: 1 },
        regionOwnerMap: new Int16Array([0]),
        regionBorderDistanceMap: new Float32Array([500]),
        worldAreaSquareMeters: 10_000_000,
      },
    };
    const items = readoutItems(readout(inspection), info, undefined, { actions: false });

    expect(items.find(entry => entry.id === 'edit-region')).toBeUndefined();
    expect(items.find(entry => entry.id === 'region')).toBeDefined();
  });

  it('skips the area row when the plan carries no measurements', () => {
    const inspection = {
      kind: 'vector',
      layerId: 'geology',
      labelKey: 'layers.geology',
      hit: { id: 'region-7' },
    } as const;
    const info = {
      geologyPlan: {
        regions: [
          {
            id: 'region-7',
            type: 'ordinary',
          },
        ],
      },
    };

    expect(itemValue(readout(inspection), 'region', info)).toBe('region-7');
    expect(item(readout(inspection), 'area', info)).toBeUndefined();
  });
});
