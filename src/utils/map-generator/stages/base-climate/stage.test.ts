import { baseClimatePresetConfig } from './defaults';
import { BaseClimateStage } from './stage';
import { MapGenerator } from '../../pipeline/pipeline';
import type { BaseClimateConfig, MapConfig, MapState } from '../../types';

function config(
  baseClimate: BaseClimateConfig = baseClimatePresetConfig('earth-like'),
  width = 5,
  height = 5
): MapConfig {
  return {
    world: {
      dimensions: {
        widthMeters: width,
        heightMeters: height,
        sampleWidth: width,
        sampleHeight: height,
      },
      seed: 123,
      shape: 'rectangle',
    },
    baseClimate,
  };
}

async function generate(source: MapConfig, mask?: Uint8Array) {
  const { sampleWidth, sampleHeight } = source.world.dimensions;
  const worldMask = mask ?? new Uint8Array(sampleWidth * sampleHeight).fill(1);
  const pipeline = new MapGenerator<MapConfig, MapState>([new BaseClimateStage()]);
  return pipeline.generate(source, { worldMask });
}

function zoneMap(result: Awaited<ReturnType<typeof generate>>): Int16Array {
  const map = result.context.state.heatZoneMap;
  if (!map) {
    throw new Error('Expected a generated heat-zone map.');
  }
  return map;
}

function moistureMap(result: Awaited<ReturnType<typeof generate>>): Float32Array {
  const map = result.context.state.moistureBaseMap;
  if (!map) {
    throw new Error('Expected a generated base-moisture map.');
  }
  return map;
}

describe('BaseClimateStage', () => {
  it('assigns one valid zone index to every cell', async () => {
    const result = await generate(config());
    const map = zoneMap(result);

    expect(map).toHaveLength(25);
    expect([...map]).toEqual([
      0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4,
    ]);
  });

  it('leaves cells outside the world mask at -1', async () => {
    const mask = new Uint8Array([
      0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0,
    ]);
    const result = await generate(config(), mask);

    expect([...zoneMap(result)]).toEqual([
      -1, 0, 0, 0, -1, 1, 1, 1, 1, 1, -1, 2, 2, 2, -1, 3, 3, 3, 3, 3, -1, 4, 4, 4, -1,
    ]);
  });

  it('uses the configured ring layout', async () => {
    const result = await generate(config(baseClimatePresetConfig('cold-core')));
    const map = zoneMap(result);

    expect(map[12]).toBe(0);
    expect(map[0]).toBe(2);
  });

  it('creates a normalized independent moisture field', async () => {
    const result = await generate(config());
    const moisture = moistureMap(result);

    expect(moisture).toHaveLength(25);
    expect([...moisture].every(value => Number.isFinite(value) && value >= 0 && value <= 1)).toBe(
      true
    );
    expect(new Set(moisture).size).toBeGreaterThan(1);
  });

  it('keeps the moisture field independent of the heat-zone layout', async () => {
    const earthLike = await generate(config(baseClimatePresetConfig('earth-like')));
    const ringWorld = await generate(config(baseClimatePresetConfig('ring-world')));

    expect(moistureMap(earthLike)).toEqual(moistureMap(ringWorld));
    expect(zoneMap(earthLike)).not.toEqual(zoneMap(ringWorld));
  });

  it('is deterministic for the same configuration', async () => {
    const source = config();

    const first = await generate(source);
    const second = await generate(source);

    expect(zoneMap(first)).toEqual(zoneMap(second));
    expect(moistureMap(first)).toEqual(moistureMap(second));
  });

  it('reports zone and thermal shares', async () => {
    const result = await generate(config());
    const details = result.statistics[0].details;

    expect(details).toMatchObject({
      zones: 5,
      coveredCells: 25,
      coldShare: 0.4,
      temperateShare: 0.4,
      warmShare: 0.2,
      moistureMin: expect.any(Number),
      moistureMax: expect.any(Number),
      moistureMean: expect.any(Number),
      moistureStdDev: expect.any(Number),
    });
  });

  it('requires a valid world mask', async () => {
    const pipeline = new MapGenerator<MapConfig, MapState>([new BaseClimateStage()]);

    await expect(pipeline.generate(config(), {})).rejects.toMatchObject({
      cause: { message: expect.stringContaining('worldMask') },
    });
  });

  it('rejects invalid heat-zone settings', async () => {
    const invalid: BaseClimateConfig = {
      ...baseClimatePresetConfig('earth-like'),
      geologyCoupling: 2,
    };

    await expect(generate(config(invalid))).rejects.toMatchObject({
      cause: { message: expect.stringContaining('Heat-zone settings') },
    });
  });

  it('validates zone indices against the mask', () => {
    const stage = new BaseClimateStage();
    const source = config(baseClimatePresetConfig('earth-like'), 2, 1);
    const worldMask = new Uint8Array([1, 0]);

    expect(() =>
      stage.validate(
        {
          worldMask,
          heatZoneMap: new Int16Array([0, -1]),
          moistureBaseMap: new Float32Array([0.5, 0]),
        },
        source
      )
    ).not.toThrow();
    expect(() =>
      stage.validate(
        {
          worldMask,
          heatZoneMap: new Int16Array([0, 0]),
          moistureBaseMap: new Float32Array([0.5, 0]),
        },
        source
      )
    ).toThrow('outside the world');
    expect(() =>
      stage.validate(
        {
          worldMask,
          heatZoneMap: new Int16Array([9, -1]),
          moistureBaseMap: new Float32Array([0.5, 0]),
        },
        source
      )
    ).toThrow('invalid zone index');
    expect(() =>
      stage.validate(
        {
          worldMask,
          heatZoneMap: new Int16Array([0, -1]),
          moistureBaseMap: new Float32Array([1.5, 0]),
        },
        source
      )
    ).toThrow('invalid value');
  });
});
