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
    expect(readoutItems(undefined).map(item => item.value)).toEqual(['—', '—']);
  });

  it('shows cell coordinates as an X/Y row without a distance', () => {
    const items = readoutItems(readout());

    expect(items[0]).toMatchObject({
      id: 'position',
      label: 'Position',
      lines: [{ label: 'Position', x: 'X 50 cell', y: 'Y 25 cell' }],
    });
    expect(items[1]).toMatchObject({ id: 'value', label: 'Value', value: '—' });
    expect(items.map(item => item.value).join(' ')).not.toContain('%');
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
    expect(itemValue(readout({ id: 'world-shape', label: 'World shape', value: 1 }), 'value')).toBe(
      'Inside'
    );
    expect(itemValue(readout({ id: 'world-shape', label: 'World shape', value: 0 }), 'value')).toBe(
      'Outside'
    );
  });

  it('describes macro region ids and noise values', () => {
    expect(
      itemValue(readout({ id: 'macro-region', label: 'Macro regions', value: 3 }), 'value')
    ).toBe('Region 3');
    expect(itemValue(readout({ id: 'noise', label: 'Noise', value: 0.25 }), 'value')).toBe('0.250');
  });

  it('shows macro region labels captured with the generated map', () => {
    const inspection = { id: 'macro-region', label: 'Macro regions', value: 1 } as const;

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

  it('describes landmass ids with their structure labels', () => {
    const inspection = { id: 'landmass-layout', label: 'Landmasses', value: 1 } as const;

    expect(itemValue(readout(inspection), 'value')).toBe('Landmass 1');
    expect(
      itemValue(readout({ ...inspection, value: 2 }), 'value', {
        landmassLabels: ['Isla Verde', 'Wasteland'],
      })
    ).toBe('Wasteland');
    expect(
      itemValue(readout({ ...inspection, value: 0 }), 'value', {
        landmassLabels: ['Isla Verde'],
      })
    ).toBe('Open sea');
    expect(
      itemValue(readout({ ...inspection, value: 5 }), 'value', {
        landmassLabels: 'nope',
      })
    ).toBe('Landmass 5');
  });

  it('keeps the layer label while the value is unavailable', () => {
    const items = readoutItems(readout({ id: 'noise', label: 'Noise' }));

    expect(items[1]).toMatchObject({ label: 'Noise', value: '—' });
  });
});
