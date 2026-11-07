import { HeatZoneOverlayInspector } from './heat-zone-inspector';
import { MoistureOverlayInspector } from './moisture-inspector';
import { OceanCurrentOverlayInspector } from './ocean-current-inspector';
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

describe('OceanCurrentOverlayInspector', () => {
  const currentData = {
    worldMask: new Uint8Array([1, 1, 1, 0]),
    oceanCurrentMap: new Float32Array([0, Math.PI / 2, (3 * Math.PI) / 2, 0]),
    oceanCurrentStrength: new Float32Array([0.5, 0.25, 0.8, 0.9]),
  };
  const currentInput = {
    x: 0,
    y: 0,
    mapSize: { width: 2, height: 2 },
    data: currentData,
    info: {},
  };

  it('reads the direction and strength under the pointer', () => {
    const inspector = new OceanCurrentOverlayInspector();

    expect(inspector.inspect(currentInput)).toEqual({
      overlayId: 'ocean-currents',
      oceanCurrent: { angle: 0, strength: 0.5 },
    });
    expect(inspector.inspect({ ...currentInput, x: 1 })).toMatchObject({
      oceanCurrent: { angle: Math.fround(Math.PI / 2), strength: 0.25 },
    });
    expect(inspector.inspect({ ...currentInput, y: 1 })).toMatchObject({
      oceanCurrent: { angle: Math.fround((3 * Math.PI) / 2), strength: Math.fround(0.8) },
    });
  });

  it('returns undefined outside the world, the map, or without data', () => {
    const inspector = new OceanCurrentOverlayInspector();

    expect(inspector.inspect({ ...currentInput, x: 1, y: 1 })).toBeUndefined();
    expect(inspector.inspect({ ...currentInput, x: 2 })).toBeUndefined();
    expect(inspector.inspect({ ...currentInput, mapSize: undefined })).toBeUndefined();
    expect(inspector.inspect({ ...currentInput, data: {} })).toBeUndefined();
    expect(
      inspector.inspect({
        ...currentInput,
        x: 1,
        y: 1,
        data: {
          worldMask: new Uint8Array([1, 1, 1, 1]),
          oceanCurrentMap: new Float32Array(3),
          oceanCurrentStrength: currentData.oceanCurrentStrength,
        },
      })
    ).toBeUndefined();
  });
});

describe('MoistureOverlayInspector', () => {
  const moistureData = {
    worldMask: new Uint8Array([1, 1, 0]),
    moistureBaseMap: new Float32Array([0.42, 0.75, 0.9]),
  };
  const moistureInput = {
    x: 0,
    y: 0,
    mapSize: { width: 3, height: 1 },
    data: moistureData,
    info: {},
  };

  it('reads the base moisture as a percentage inside the world', () => {
    const inspector = new MoistureOverlayInspector();

    expect(inspector.inspect(moistureInput)).toEqual({
      overlayId: 'moisture',
      value: '42%',
    });
    expect(inspector.inspect({ ...moistureInput, x: 1 })).toMatchObject({ value: '75%' });
  });

  it('returns undefined outside the world, the map, or without data', () => {
    const inspector = new MoistureOverlayInspector();

    expect(inspector.inspect({ ...moistureInput, x: 2 })).toBeUndefined();
    expect(inspector.inspect({ ...moistureInput, x: 3 })).toBeUndefined();
    expect(inspector.inspect({ ...moistureInput, mapSize: undefined })).toBeUndefined();
    expect(inspector.inspect({ ...moistureInput, data: {} })).toBeUndefined();
  });
});

describe('OverlayInspectorRegistry', () => {
  it('delegates only to visible inspectors and returns every value', () => {
    const registry = new OverlayInspectorRegistry([new HeatZoneOverlayInspector()]);

    expect(registry.inspectAll(input, () => false)).toEqual([]);
    expect(registry.inspectAll(input, id => id === 'heat-zones')).toEqual([
      { overlayId: 'heat-zones', value: 'Cold' },
    ]);
  });
});
