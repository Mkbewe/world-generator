import { type InspectorReadout, type ReadoutItem, readoutItems } from './readout';
import type { LandmassLayout } from '../map-generator/types';
import type { MapInspection } from '../map-renderer';

const LAYOUT: LandmassLayout = {
  structures: [
    {
      id: 'landmass-1',
      archetype: 'elongated',
      nodes: [
        { id: 'landmass-1-n1', position: { x: 0.4, y: 0.5 }, radius: 0.05 },
        { id: 'landmass-1-n2', position: { x: 0.6, y: 0.5 }, radius: 0.03 },
      ],
      edges: [{ id: 'landmass-1-e1', from: 'landmass-1-n1', to: 'landmass-1-n2' }],
      shelfId: 'shelf-1',
    },
  ],
  shelves: [{ id: 'shelf-1', width: 0.07, targetDepth: 0.35, falloff: 0.5, irregularity: 0.35 }],
};

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
    const inspection = { kind: 'raster', layerId: 'world-shape', label: 'World shape' } as const;

    expect(itemValue(readout({ ...inspection, value: 1 }), 'value')).toBe('Inside');
    expect(itemValue(readout({ ...inspection, value: 0 }), 'value')).toBe('Outside');
  });

  it('describes macro region ids and noise values', () => {
    expect(
      itemValue(
        readout({ kind: 'raster', layerId: 'macro-region', label: 'Macro regions', value: 3 }),
        'value'
      )
    ).toBe('Region 3');
    expect(
      itemValue(readout({ kind: 'raster', layerId: 'noise', label: 'Noise', value: 0.25 }), 'value')
    ).toBe('0.250');
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

  it('names the vector element under the pointer', () => {
    const inspection = {
      kind: 'vector',
      layerId: 'landmass-layout',
      label: 'Landmasses',
      hit: { id: 'landmass-1' },
    } as const;

    expect(itemValue(readout(inspection), 'name')).toBe('landmass-1');
    expect(itemValue(readout({ ...inspection, hit: undefined }), 'name')).toBe('—');
  });

  it('keeps the layer label while the raster sample is unavailable', () => {
    const raster = readoutItems(readout({ kind: 'raster', layerId: 'noise', label: 'Noise' }));

    expect(raster[1]).toMatchObject({ label: 'Noise', value: '—' });
  });

  it('shows the landmass type and its measurements', () => {
    const inspection = {
      kind: 'vector',
      layerId: 'landmass-layout',
      label: 'Landmasses',
      hit: { id: 'landmass-1' },
    } as const;
    const info = {
      landmassLayout: LAYOUT,
      worldDimensions: {
        widthMeters: 4000,
        heightMeters: 2000,
        sampleWidth: 2000,
        sampleHeight: 1000,
      },
    };
    const items = readoutItems(readout(inspection), info);

    expect(items.map(item => item.id)).toEqual([
      'position',
      'name',
      'archetype',
      'nodes',
      'length',
      'width',
    ]);
    expect(itemValue(readout(inspection), 'name', info)).toBe('landmass-1');
    expect(itemValue(readout(inspection), 'archetype', info)).toBe('elongated');
    expect(itemValue(readout(inspection), 'nodes', info)).toBe('2');
    expect(itemValue(readout(inspection), 'length', info)).toBe('800 m');
    expect(itemValue(readout(inspection), 'width', info)).toBe('180 m–300 m');
  });

  it('falls back to normalized measurements without world dimensions', () => {
    const inspection = {
      kind: 'vector',
      layerId: 'landmass-layout',
      label: 'Landmasses',
      hit: { id: 'landmass-1' },
    } as const;
    const info = { landmassLayout: LAYOUT };

    expect(itemValue(readout(inspection), 'length', info)).toBe('0.200');
    expect(itemValue(readout(inspection), 'width', info)).toBe('0.060–0.100');
  });

  it('shows no measurements for a hit outside the captured layout', () => {
    const inspection = {
      kind: 'vector',
      layerId: 'landmass-layout',
      label: 'Landmasses',
      hit: { id: 'landmass-9' },
    } as const;
    const items = readoutItems(readout(inspection), { landmassLayout: LAYOUT });

    expect(items[1]).toMatchObject({ id: 'name', value: 'landmass-9' });
    expect(items).toHaveLength(2);
  });

  it('shows the character zone under the pointer', () => {
    const values = {
      elevation: 0.5,
      roughness: 0.5,
      mountainStrength: 0.8,
      hillStrength: 0.5,
      plateauStrength: 0.3,
      lakePotential: 0.2,
      erosionStrength: 0.5,
      coastalCliffStrength: 0.4,
    };
    const info = {
      structureZones: [
        {
          id: 'large-zone-1',
          structureId: 'large',
          character: 'mountains',
          geometry: { kind: 'whole' },
          values,
        },
        {
          id: 'large-zone-2',
          structureId: 'large',
          character: 'plains',
          geometry: { kind: 'half', axis: 'x', side: 'low' },
          values,
        },
      ],
    };
    const inspection = {
      kind: 'vector',
      layerId: 'structure-character',
      label: 'Character',
      hit: { id: 'large-zone-2' },
    } as const;
    const items = readoutItems(readout(inspection), info);

    expect(items.map(item => item.id)).toEqual([
      'position',
      'name',
      'character',
      'plateau',
      'lakes',
      'erosion',
      'cliffs',
    ]);
    expect(itemValue(readout(inspection), 'name', info)).toBe('large');
    expect(itemValue(readout(inspection), 'character', info)).toBe('Plains');
    expect(itemValue(readout(inspection), 'plateau', info)).toBe('30%');
    expect(itemValue(readout(inspection), 'lakes', info)).toBe('20%');
  });

  it('falls back to the plain name for a character hit outside the zones', () => {
    const inspection = {
      kind: 'vector',
      layerId: 'structure-character',
      label: 'Character',
      hit: { id: 'missing-zone' },
    } as const;
    const items = readoutItems(readout(inspection), { structureZones: [] });

    expect(items[1]).toMatchObject({ id: 'name', value: 'missing-zone' });
    expect(items).toHaveLength(2);
  });
});
