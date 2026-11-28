import { buildMoistureMap } from './moisture';
import type { WorldDimensions } from '../../../world-dimensions';
import { createWorldSpace } from '../../space';
import type { MoistureZoneConfig } from '../../types';

function dimensionsOf(sampleWidth: number, sampleHeight: number): WorldDimensions {
  return {
    widthMeters: sampleWidth,
    heightMeters: sampleHeight,
    sampleWidth,
    sampleHeight,
  };
}

function zone(kind: MoistureZoneConfig['kind']): MoistureZoneConfig {
  return {
    id: kind,
    label: kind,
    kind,
    geometry: { kind: 'band', axis: 'x', center: 0.5, width: 1 },
  };
}

function inputOf(
  overrides: Partial<Parameters<typeof buildMoistureMap>[0]> = {}
): Parameters<typeof buildMoistureMap>[0] {
  const dimensions = dimensionsOf(4, 1);
  return {
    worldMask: new Uint8Array(4).fill(1),
    heightmap: new Float32Array(4).fill(0),
    moistureBaseMap: new Float32Array(4).fill(0.5),
    oceanCurrentMap: new Float32Array(4),
    oceanCurrentStrength: new Float32Array(4),
    zones: [],
    dimensions,
    space: createWorldSpace(dimensions),
    ...overrides,
  };
}

describe('buildMoistureMap', () => {
  it('keeps the base moisture without zones or currents', () => {
    const moistureMap = buildMoistureMap(inputOf());

    for (const value of moistureMap) {
      expect(value).toBeCloseTo(0.5, 6);
    }
  });

  it('biases the base moisture with manual zones', () => {
    const dry = buildMoistureMap(inputOf({ zones: [zone('dry')] }));
    const wet = buildMoistureMap(inputOf({ zones: [zone('wet')] }));

    expect(Array.from(dry).every(value => Math.abs(value - 0.3) < 1e-5)).toBe(true);
    expect(Array.from(wet).every(value => Math.abs(value - 0.7) < 1e-5)).toBe(true);
  });

  it('applies a manual zone only where it covers the world', () => {
    const partial: MoistureZoneConfig = {
      id: 'dry-belt',
      label: 'Dry belt',
      kind: 'dry',
      geometry: { kind: 'band', axis: 'x', center: 0.25, width: 0.5 },
    };
    const moistureMap = buildMoistureMap(inputOf({ zones: [partial] }));

    expect(moistureMap[0]).toBeCloseTo(0.3, 5);
    expect(moistureMap[1]).toBeCloseTo(0.3, 5);
    expect(moistureMap[2]).toBeCloseTo(0.5, 5);
    expect(moistureMap[3]).toBeCloseTo(0.5, 5);
  });

  it('modulates moisture with the current direction and strength', () => {
    const eastward = buildMoistureMap(
      inputOf({
        oceanCurrentMap: new Float32Array(4),
        oceanCurrentStrength: new Float32Array(4).fill(1),
      })
    );
    const westward = buildMoistureMap(
      inputOf({
        oceanCurrentMap: new Float32Array(4).fill(Math.PI),
        oceanCurrentStrength: new Float32Array(4).fill(1),
      })
    );

    expect(eastward[0]).toBeGreaterThan(0.5);
    expect(westward[0]).toBeLessThan(0.5);
  });

  it('dries the lee side of a rising ridge', () => {
    const moistureMap = buildMoistureMap(
      inputOf({
        heightmap: new Float32Array([10, 10, 510, 510]),
      })
    );

    expect(moistureMap[2]).toBeLessThan(moistureMap[1]);
    expect(moistureMap[3]).toBeLessThan(moistureMap[1]);
    expect(moistureMap[3]).toBeGreaterThan(moistureMap[2]);
  });

  it('leaves moisture outside the world at zero', () => {
    const moistureMap = buildMoistureMap(
      inputOf({
        worldMask: new Uint8Array([1, 1, 0, 0]),
      })
    );

    expect(moistureMap[2]).toBe(0);
    expect(moistureMap[3]).toBe(0);
  });

  it('is deterministic for the same inputs', () => {
    const input = inputOf({ zones: [zone('wet')] });

    expect(Array.from(buildMoistureMap(input))).toEqual(Array.from(buildMoistureMap(input)));
  });
});
