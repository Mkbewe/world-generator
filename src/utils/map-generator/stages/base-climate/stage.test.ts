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

function currentMap(result: Awaited<ReturnType<typeof generate>>): Float32Array {
  const map = result.context.state.oceanCurrentMap;
  if (!map) {
    throw new Error('Expected a generated ocean-current map.');
  }
  return map;
}

function currentStrength(result: Awaited<ReturnType<typeof generate>>): Float32Array {
  const strength = result.context.state.oceanCurrentStrength;
  if (!strength) {
    throw new Error('Expected generated ocean-current strengths.');
  }
  return strength;
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

  it('bends heat-zone borders with the configured irregularity', async () => {
    const crisp = baseClimatePresetConfig('earth-like');
    const bent = { ...crisp, zoneIrregularity: 0.2 };
    const clean = await generate(config(crisp, 16, 16));
    const warped = await generate(config(bent, 16, 16));
    const repeated = await generate(config(bent, 16, 16));

    expect(zoneMap(warped)).not.toEqual(zoneMap(clean));
    expect(zoneMap(repeated)).toEqual(zoneMap(warped));
    expect([...zoneMap(warped)].every(zone => zone >= 0 && zone < 5)).toBe(true);
  });

  it('shifts the moisture field with the world moisture control', async () => {
    const preset = baseClimatePresetConfig('earth-like');
    const dry = await generate(config({ ...preset, moisture: 0 }, 16, 16));
    const balanced = await generate(config({ ...preset, moisture: 0.5 }, 16, 16));
    const wet = await generate(config({ ...preset, moisture: 1 }, 16, 16));
    const mean = (map: Float32Array): number =>
      [...map].reduce((sum, value) => sum + value, 0) / map.length;

    expect(mean(moistureMap(dry))).toBeLessThan(mean(moistureMap(balanced)));
    expect(mean(moistureMap(balanced))).toBeLessThan(mean(moistureMap(wet)));
  });

  it('validates the ring preset with the form defaults on a wider raster', async () => {
    const preset = baseClimatePresetConfig('ring-world');
    const result = await generate(
      config({ ...preset, moisture: 0.5, zoneIrregularity: 0.06 }, 64, 32)
    );

    expect(result.context.state.oceanCurrentMap).toBeDefined();
    expect(result.context.state.oceanCurrentStrength).toBeDefined();
  });

  it('keeps the moisture field independent of the heat-zone layout', async () => {
    const earthLike = await generate(config(baseClimatePresetConfig('earth-like')));
    const ringWorld = await generate(config(baseClimatePresetConfig('ring-world')));

    expect(moistureMap(earthLike)).toEqual(moistureMap(ringWorld));
    expect(zoneMap(earthLike)).not.toEqual(zoneMap(ringWorld));
  });

  it('creates normalized current directions and strengths', async () => {
    const result = await generate(config());
    const directions = currentMap(result);
    const strengths = currentStrength(result);

    expect(directions).toHaveLength(25);
    expect(strengths).toHaveLength(25);
    expect(
      [...directions].every(value => Number.isFinite(value) && value >= 0 && value <= Math.PI * 2)
    ).toBe(true);
    expect([...strengths].every(value => Number.isFinite(value) && value >= 0 && value <= 1)).toBe(
      true
    );
    expect(new Set(strengths).size).toBeGreaterThan(1);
  });

  it('turns ring-world currents into an outward spiral and cold-core currents inward', async () => {
    const ringWorld = await generate(config(baseClimatePresetConfig('ring-world')));
    const coldCore = await generate(config(baseClimatePresetConfig('cold-core')));
    const eastOfCentre = 2 * 5 + 3;
    const spiral = currentMap(ringWorld)[eastOfCentre];

    expect(spiral).toBeCloseTo(Math.atan2(0.45, 0.55));
    expect(spiral).toBeGreaterThan(0);
    expect(spiral).toBeLessThan(Math.PI / 2);
    expect(currentMap(coldCore)[eastOfCentre]).toBeCloseTo(Math.PI);
    expect(spiral).not.toBeCloseTo(currentMap(coldCore)[eastOfCentre]);
  });

  it('leaves currents empty outside the world mask', async () => {
    const result = await generate(
      config(baseClimatePresetConfig('earth-like'), 2, 1),
      new Uint8Array([1, 0])
    );

    expect(currentMap(result)[1]).toBe(0);
    expect(currentStrength(result)[1]).toBe(0);
  });

  it('is deterministic for the same configuration', async () => {
    const source = config();

    const first = await generate(source);
    const second = await generate(source);

    expect(zoneMap(first)).toEqual(zoneMap(second));
    expect(moistureMap(first)).toEqual(moistureMap(second));
    expect(currentMap(first)).toEqual(currentMap(second));
    expect(currentStrength(first)).toEqual(currentStrength(second));
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
      cause: { message: expect.stringContaining('BaseClimate settings') },
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
          oceanCurrentMap: new Float32Array([0, 0]),
          oceanCurrentStrength: new Float32Array([0, 0]),
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
          oceanCurrentMap: new Float32Array([0, 0]),
          oceanCurrentStrength: new Float32Array([0, 0]),
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
          oceanCurrentMap: new Float32Array([0, 0]),
          oceanCurrentStrength: new Float32Array([0, 0]),
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
          oceanCurrentMap: new Float32Array([0, 0]),
          oceanCurrentStrength: new Float32Array([0, 0]),
        },
        source
      )
    ).toThrow('invalid value');
  });

  it('validates current directions and strengths', () => {
    const stage = new BaseClimateStage();
    const source = config(baseClimatePresetConfig('earth-like'), 2, 1);
    const state = {
      worldMask: new Uint8Array([1, 0]),
      heatZoneMap: new Int16Array([0, -1]),
      moistureBaseMap: new Float32Array([0.5, 0]),
      oceanCurrentMap: new Float32Array([0, 0]),
      oceanCurrentStrength: new Float32Array([0.5, 0]),
    };

    expect(() => stage.validate(state, source)).not.toThrow();
    expect(() =>
      stage.validate({ ...state, oceanCurrentMap: new Float32Array([Math.PI * 3, 0]) }, source)
    ).toThrow('invalid value');
    expect(() =>
      stage.validate({ ...state, oceanCurrentStrength: new Float32Array([1.2, 0]) }, source)
    ).toThrow('invalid value');
    // Float32 storage can round a valid angle just below 2π above the double value.
    expect(() =>
      stage.validate({ ...state, oceanCurrentMap: new Float32Array([Math.PI * 2, 0]) }, source)
    ).not.toThrow();
  });
});
