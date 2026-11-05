import { HeatZoneOverlayInspector } from './heat-zone-inspector';
import { OverlayInspectorRegistry } from './overlay-inspector';

const mapSize = { width: 2, height: 1 };
const data = { heatZoneMap: new Int16Array([0, 1]) };
const info = {
  heatZoneInfo: [
    { id: 'cold', label: 'Cold', thermal: 'cold' as const },
    { id: 'warm', label: 'Warm', thermal: 'warm' as const },
  ],
};
const input = { x: 0, y: 0, mapSize, data, info };

describe('HeatZoneOverlayInspector', () => {
  it('reads the zone label from the heat map', () => {
    const inspector = new HeatZoneOverlayInspector();

    expect(inspector.inspect(input)).toEqual({
      overlayId: 'heat-zones',
      label: 'Heat zone',
      value: 'Cold',
    });
    expect(inspector.inspect({ ...input, x: 1 })).toMatchObject({ value: 'Warm' });
  });

  it('returns undefined outside the map, outside the world, or without data', () => {
    const inspector = new HeatZoneOverlayInspector();

    expect(inspector.inspect({ ...input, x: 2 })).toBeUndefined();
    expect(inspector.inspect({ ...input, mapSize: undefined })).toBeUndefined();
    expect(inspector.inspect({ ...input, data: {} })).toBeUndefined();
    expect(inspector.inspect({ ...input, info: { heatZoneInfo: 'nope' } })).toBeUndefined();
    expect(
      inspector.inspect({ ...input, data: { heatZoneMap: new Int16Array([-1, 0]) } })
    ).toBeUndefined();
  });
});

describe('OverlayInspectorRegistry', () => {
  it('delegates only to visible inspectors and returns the first value', () => {
    const registry = new OverlayInspectorRegistry([new HeatZoneOverlayInspector()]);

    expect(registry.inspect(input, () => false)).toBeUndefined();
    expect(registry.inspect(input, id => id === 'heat-zones')).toMatchObject({ value: 'Cold' });
  });
});
