import {
  CLIMATE_LAPSE_PER_1000_METERS,
  CLIMATE_TEMPERATURE_NOISE_AMPLITUDE,
  HEAT_ZONE_TEMPERATURES,
} from './defaults';
import { buildTemperatureMap, type TemperatureFieldInput } from './temperature';
import type { WorldDimensions } from '../../../world-dimensions';
import { RandomFactory } from '../../random';
import { createWorldSpace } from '../../space';
import type { HeatZoneConfig } from '../../types';

const zones: readonly HeatZoneConfig[] = [
  {
    id: 'cold',
    label: 'Cold',
    thermal: 'cold',
    geometry: { kind: 'band', axis: 'y', center: 0.25, width: 0.5 },
  },
  {
    id: 'warm',
    label: 'Warm',
    thermal: 'warm',
    geometry: { kind: 'band', axis: 'y', center: 0.75, width: 0.5 },
  },
];

interface FieldOptions {
  readonly sampleWidth: number;
  readonly sampleHeight: number;
  readonly worldMask?: Uint8Array;
  readonly heatZoneMap?: Int16Array;
  readonly heightmap?: Float32Array;
  readonly oceanCurrentStrength?: Float32Array;
  readonly seed?: number;
}

function dimensionsOf(sampleWidth: number, sampleHeight: number): WorldDimensions {
  return {
    widthMeters: sampleWidth,
    heightMeters: sampleHeight,
    sampleWidth,
    sampleHeight,
  };
}

function fieldOf(options: FieldOptions): TemperatureFieldInput {
  const dimensions = dimensionsOf(options.sampleWidth, options.sampleHeight);
  const cells = options.sampleWidth * options.sampleHeight;
  return {
    worldMask: options.worldMask ?? new Uint8Array(cells).fill(1),
    heatZoneMap: options.heatZoneMap ?? new Int16Array(cells),
    heightmap: options.heightmap ?? new Float32Array(cells).fill(5),
    oceanCurrentStrength: options.oceanCurrentStrength ?? new Float32Array(cells),
    zones,
    dimensions,
    space: createWorldSpace(dimensions),
    random: new RandomFactory(options.seed ?? 17),
  };
}

function expectNear(value: number, expected: number, tolerance: number): void {
  expect(Math.abs(value - expected)).toBeLessThanOrEqual(tolerance);
}

describe('buildTemperatureMap', () => {
  it('keeps a uniform heat zone near its base temperature', () => {
    const temperatureMap = buildTemperatureMap(fieldOf({ sampleWidth: 12, sampleHeight: 12 }));

    const expected = HEAT_ZONE_TEMPERATURES.cold - (5 / 1000) * CLIMATE_LAPSE_PER_1000_METERS;
    for (const value of temperatureMap) {
      expectNear(value, expected, CLIMATE_TEMPERATURE_NOISE_AMPLITUDE + 1e-6);
    }
  });

  it('transitions smoothly between two heat zones', () => {
    const temperatureMap = buildTemperatureMap(
      fieldOf({
        sampleWidth: 7,
        sampleHeight: 1,
        heatZoneMap: new Int16Array([0, 0, 0, 1, 1, 1, 1]),
      })
    );

    expect(temperatureMap[2]).toBeGreaterThan(HEAT_ZONE_TEMPERATURES.cold);
    expect(temperatureMap[2]).toBeLessThan(HEAT_ZONE_TEMPERATURES.warm);
    expect(temperatureMap[3]).toBeGreaterThan(HEAT_ZONE_TEMPERATURES.cold);
    expect(temperatureMap[3]).toBeLessThan(HEAT_ZONE_TEMPERATURES.warm);
  });

  it('keeps zero outside the world and fills the coarse edge from inside votes', () => {
    const temperatureMap = buildTemperatureMap(
      fieldOf({
        sampleWidth: 5,
        sampleHeight: 1,
        worldMask: new Uint8Array([1, 1, 1, 0, 0]),
        heatZoneMap: new Int16Array([0, 0, 0, 0, 0]),
      })
    );

    for (let index = 0; index < 3; index++) {
      expectNear(
        temperatureMap[index],
        HEAT_ZONE_TEMPERATURES.cold - (5 / 1000) * CLIMATE_LAPSE_PER_1000_METERS,
        CLIMATE_TEMPERATURE_NOISE_AMPLITUDE + 1e-6
      );
    }
    expect(temperatureMap[3]).toBe(0);
    expect(temperatureMap[4]).toBe(0);
  });

  it('cools land with elevation at the lapse rate', () => {
    const cells = 16 * 16;
    const low = buildTemperatureMap(
      fieldOf({
        sampleWidth: 16,
        sampleHeight: 16,
        heightmap: new Float32Array(cells).fill(5),
      })
    );
    const high = buildTemperatureMap(
      fieldOf({
        sampleWidth: 16,
        sampleHeight: 16,
        heightmap: new Float32Array(cells).fill(605),
      })
    );

    const lapse = (600 / 1000) * CLIMATE_LAPSE_PER_1000_METERS;
    for (let index = 0; index < cells; index++) {
      expectNear(low[index] - high[index], lapse, 1e-5);
    }
  });

  it('moderates shallow water more than deep water', () => {
    const cells = 12 * 12;
    const shallow = buildTemperatureMap(
      fieldOf({
        sampleWidth: 12,
        sampleHeight: 12,
        heatZoneMap: new Int16Array(cells).fill(1),
        heightmap: new Float32Array(cells).fill(-10),
        oceanCurrentStrength: new Float32Array(cells).fill(1),
      })
    );
    const deep = buildTemperatureMap(
      fieldOf({
        sampleWidth: 12,
        sampleHeight: 12,
        heatZoneMap: new Int16Array(cells).fill(1),
        heightmap: new Float32Array(cells).fill(-140),
        oceanCurrentStrength: new Float32Array(cells).fill(1),
      })
    );

    for (let index = 0; index < cells; index++) {
      expect(deep[index] - shallow[index]).toBeCloseTo(0.045, 5);
    }
  });

  it('moderates low land near the coast and leaves inland unchanged', () => {
    const sampleWidth = 96;
    const sampleHeight = 32;
    const cells = sampleWidth * sampleHeight;
    const heatZoneMap = new Int16Array(cells).fill(1);
    const oceanCurrentStrength = new Float32Array(cells).fill(1);
    const coastalHeights = new Float32Array(cells).fill(10);
    for (let y = 0; y < sampleHeight; y++) {
      for (let x = 0; x < 21; x++) {
        coastalHeights[y * sampleWidth + x] = -140;
      }
    }

    const coastal = buildTemperatureMap(
      fieldOf({
        sampleWidth,
        sampleHeight,
        heatZoneMap,
        heightmap: coastalHeights,
        oceanCurrentStrength,
      })
    );
    const inland = buildTemperatureMap(
      fieldOf({
        sampleWidth,
        sampleHeight,
        heatZoneMap,
        heightmap: new Float32Array(cells).fill(10),
        oceanCurrentStrength,
      })
    );

    expect(coastal[21]).toBeLessThan(inland[21]);
    expect(coastal[90]).toBe(inland[90]);
  });

  it('adds a broad anomaly around the base temperature', () => {
    const expected = HEAT_ZONE_TEMPERATURES.cold - (5 / 1000) * CLIMATE_LAPSE_PER_1000_METERS;
    const temperatureMap = buildTemperatureMap(fieldOf({ sampleWidth: 16, sampleHeight: 16 }));

    const changed = Array.from(temperatureMap).filter(value => Math.abs(value - expected) > 1e-4);
    expect(changed.length).toBeGreaterThan(0);
  });

  it('reports monotonic progress from zero to one', () => {
    const progress: number[] = [];
    buildTemperatureMap({
      ...fieldOf({ sampleWidth: 8, sampleHeight: 4 }),
      report: value => progress.push(value),
    });

    expect(progress.length).toBeGreaterThan(0);
    expect(progress[0]).toBeGreaterThan(0);
    expect(progress[progress.length - 1]).toBe(1);
    for (let index = 1; index < progress.length; index++) {
      expect(progress[index]).toBeGreaterThanOrEqual(progress[index - 1]);
    }
  });

  it('returns identical rasters for identical inputs', () => {
    const cells = 8 * 4;
    const worldMask = new Uint8Array(cells);
    const heatZoneMap = new Int16Array(cells);
    for (let index = 0; index < cells; index++) {
      worldMask[index] = index % 7 === 0 ? 0 : 1;
      heatZoneMap[index] = index % 3 === 0 ? 1 : 0;
    }

    const input = fieldOf({
      sampleWidth: 8,
      sampleHeight: 4,
      worldMask,
      heatZoneMap,
      heightmap: new Float32Array(cells).fill(40),
    });

    const first = buildTemperatureMap(input);
    const second = buildTemperatureMap(input);

    expect(Array.from(second)).toEqual(Array.from(first));
  });

  it('uses the seed for its anomaly and warp', () => {
    const first = buildTemperatureMap(fieldOf({ sampleWidth: 12, sampleHeight: 12, seed: 17 }));
    const second = buildTemperatureMap(fieldOf({ sampleWidth: 12, sampleHeight: 12, seed: 18 }));

    expect(Array.from(second)).not.toEqual(Array.from(first));
  });

  it('keeps cold zones below temperate zones below warm zones', () => {
    expect(HEAT_ZONE_TEMPERATURES.cold).toBeLessThan(HEAT_ZONE_TEMPERATURES.temperate);
    expect(HEAT_ZONE_TEMPERATURES.temperate).toBeLessThan(HEAT_ZONE_TEMPERATURES.warm);
  });

  it('rejects a heat-zone index that is not configured', () => {
    expect(() =>
      buildTemperatureMap(
        fieldOf({
          sampleWidth: 1,
          sampleHeight: 1,
          heatZoneMap: new Int16Array([3]),
        })
      )
    ).toThrow('Heat-zone map contains a zone that is not configured.');
  });
});
