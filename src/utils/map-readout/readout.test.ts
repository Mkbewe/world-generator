import { type InspectorReadout, type ReadoutItem, readoutItems } from './readout';
import type { MapInspection } from '../map-renderer';

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
  return item(readoutValue, id, info)?.value;
}

describe('readoutItems', () => {
  it('shows placeholders without a readout', () => {
    expect(readoutItems(undefined).map(value => value.value)).toEqual(['—', '—']);
  });

  it('shows cell coordinates as an X/Y row without a distance', () => {
    const items = readoutItems(readout());

    expect(items[0]).toMatchObject({
      id: 'position',
      label: 'Position',
      lines: [{ label: 'Position', x: 'X 50 cell', y: 'Y 25 cell' }],
    });
    expect(items[1]).toMatchObject({ id: 'value', label: 'Value', value: '—' });
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
      { label: 'Position', x: 'X 50 cell', y: 'Y 25 cell' },
      { label: 'Distance', x: 'X 100 m', y: 'Y 50 m' },
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
      label: 'Distance',
      x: 'X 166.7 m',
      y: 'Y 83.3 m',
    });
  });

  it('omits the distance row for malformed dimensions', () => {
    const malformed = {
      worldDimensions: { widthMeters: 100, heightMeters: 100, sampleWidth: 0, sampleHeight: 0 },
    };

    expect(item(readout(), 'position', { worldDimensions: 'nope' })?.lines).toEqual([
      { label: 'Position', x: 'X 50 cell', y: 'Y 25 cell' },
    ]);
    expect(item(readout(), 'position', malformed)?.lines).toEqual([
      { label: 'Position', x: 'X 50 cell', y: 'Y 25 cell' },
    ]);
  });

  it('describes world shape values', () => {
    const inspection = { kind: 'raster', layerId: 'world-shape', label: 'World shape' } as const;

    expect(itemValue(readout({ ...inspection, value: 1 }), 'value')).toBe('Inside');
    expect(itemValue(readout({ ...inspection, value: 0 }), 'value')).toBe('Outside');
  });

  it('describes macro region ids with their labels', () => {
    expect(
      itemValue(
        readout({ kind: 'raster', layerId: 'macro-region', label: 'Macro regions', value: 3 }),
        'value'
      )
    ).toBe('Region 3');
  });

  it('shows macro region labels captured with the generated map', () => {
    const inspection = {
      kind: 'raster',
      layerId: 'macro-region',
      label: 'Macro regions',
      value: 1,
    } as const;

    expect(
      readoutItems(readout(inspection), { macroRegionLabels: ['Safe haven', 'Wasteland'] })[1].value
    ).toBe('Wasteland');
    expect(readoutItems(readout(inspection), { macroRegionLabels: ['Safe'] })[1].value).toBe(
      'Region 1'
    );
    expect(readoutItems(readout(inspection), { macroRegionLabels: ['', ' '] })[1].value).toBe(
      'Region 1'
    );
    expect(readoutItems(readout(inspection), { macroRegionLabels: 'nope' })[1].value).toBe(
      'Region 1'
    );
  });

  it('keeps the layer label while the raster sample is unavailable', () => {
    const raster = readoutItems(
      readout({ kind: 'raster', layerId: 'world-shape', label: 'World shape' })
    );

    expect(raster[1]).toMatchObject({ label: 'World shape', value: '—' });
  });

  it('shows the generated region and its type under the pointer', () => {
    const inspection = {
      kind: 'vector',
      layerId: 'geology',
      label: 'Geology',
      hit: { id: 'region-2' },
    } as const;
    const info = {
      geologyPlan: {
        regions: [
          {
            id: 'region-2',
            centre: { x: 0.5, y: 0.5 },
            weight: 1,
            type: 'atoll',
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
    expect(itemValue(readout(inspection), 'type', info)).toBe('Atoll');
    expect(itemValue(readout(inspection), 'character', info)).toBe(
      'Low reef platforms and lagoons'
    );
    expect(itemValue(readout(inspection), 'area', info)).toBe('2 km² · 20.0%');
    expect(item(readout(inspection), 'edit-region', info)?.action).toEqual({
      id: 'edit-region',
      label: 'Edit region',
    });
  });

  it('skips the area row when the plan carries no measurements', () => {
    const inspection = {
      kind: 'vector',
      layerId: 'geology',
      label: 'Geology',
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
