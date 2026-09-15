import { type InspectorReadout, readoutItems, samplePointer } from './readout';
import type { MapInspection } from '../../utils/map-renderer';

const SIZE = { width: 2400, height: 2400 };

describe('samplePointer', () => {
  it('maps a scaled preview onto source cells', () => {
    const rect = { left: 10, top: 20, width: 600, height: 600 };

    expect(samplePointer(rect, SIZE, 310, 320)).toEqual({
      x: 1200,
      y: 1200,
      u: 0.5,
      v: 0.5,
    });
  });

  it('derives cells from normalized position, not canvas resolution', () => {
    const rect = { left: 0, top: 0, width: 300, height: 300 };

    expect(samplePointer(rect, { width: 1000, height: 1000 }, 150, 150)?.x).toBe(500);
  });

  it('clamps points outside the preview', () => {
    const rect = { left: 0, top: 0, width: 100, height: 100 };

    expect(samplePointer(rect, { width: 10, height: 10 }, -50, -50)).toMatchObject({
      x: 0,
      y: 0,
      u: 0,
      v: 0,
    });
    expect(samplePointer(rect, { width: 10, height: 10 }, 150, 150)).toMatchObject({
      x: 9,
      y: 9,
      u: 1,
      v: 1,
    });
  });

  it('ignores empty rectangles', () => {
    expect(samplePointer({ left: 0, top: 0, width: 0, height: 10 }, SIZE, 0, 0)).toBeUndefined();
    expect(samplePointer({ left: 0, top: 0, width: 10, height: 0 }, SIZE, 0, 0)).toBeUndefined();
  });
});

function readout(inspection?: MapInspection): InspectorReadout {
  return {
    position: { x: 50, y: 25, u: 0.505, v: 0.255 },
    inspection,
  };
}

function itemValue(readoutValue: InspectorReadout | undefined, id: string): string | undefined {
  return readoutItems(readoutValue).find(item => item.id === id)?.value;
}

describe('readoutItems', () => {
  it('shows placeholders without a readout', () => {
    expect(readoutItems(undefined).map(item => item.value)).toEqual(['—', '—']);
  });

  it('shows labelled source coordinates instead of percentages', () => {
    const items = readoutItems(readout());

    expect(items[0]).toMatchObject({
      id: 'position',
      label: 'Position',
      value: 'X 50, Y 25',
    });
    expect(items[1]).toMatchObject({ id: 'value', label: 'Value', value: '—' });
    expect(items.map(item => item.value).join(' ')).not.toContain('%');
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

  it('keeps the layer label while the value is unavailable', () => {
    const items = readoutItems(readout({ id: 'noise', label: 'Noise' }));

    expect(items[1]).toMatchObject({ label: 'Noise', value: '—' });
  });
});
