import {
  createBandOverlay,
  createHorizontalLayout,
  createRadialLayout,
  createRadialPolesLayout,
} from './macro-region-presets';
import { createMacroRegionSampler, MacroRegionStage } from './macro-region-stage';
import { NoiseStage } from './noise-stage';
import { MapGenerator } from '../pipeline';
import type { MacroRegionConfig, MapConfig, MapState } from '../types';

const noise = { frequency: 4, octaves: 3, persistence: 0.5, lacunarity: 2 };

function config(macroRegions: readonly MacroRegionConfig[], width = 5, height = 5): MapConfig {
  return {
    world: {
      dimensions: {
        widthMeters: width,
        heightMeters: height,
        sampleWidth: width,
        sampleHeight: height,
      },
      seed: 123,
      shape: 'disc',
    },
    noise,
    macroRegions,
    macroRegionDeformation: { amplitude: 0 },
  };
}

async function generate(source: MapConfig, mask?: Uint8Array) {
  const { sampleWidth, sampleHeight } = source.world.dimensions;
  const worldMask = mask ?? new Uint8Array(sampleWidth * sampleHeight).fill(1);
  const pipeline = new MapGenerator<MapConfig, MapState>([
    new NoiseStage(),
    new MacroRegionStage(),
  ]);
  return pipeline.generate(source, { worldMask });
}

function regionMap(result: Awaited<ReturnType<typeof generate>>): Uint8Array {
  const map = result.context.state.macroRegionIdMap;
  if (!map) {
    throw new Error('Expected a generated region map.');
  }
  return map;
}

describe('MacroRegionStage', () => {
  it('uses one radial displacement without favoring a diagonal direction', () => {
    const regionAt = createMacroRegionSampler(createRadialLayout(2), { amplitude: 0.1 }, () => 1);

    expect(regionAt(0.7, 0.5)).toBe(1);
    expect(regionAt(0.3, 0.5)).toBe(1);
    expect(regionAt(0.5, 0.7)).toBe(1);
    expect(regionAt(0.5, 0.3)).toBe(1);
  });

  it('assigns one valid region index to every cell', async () => {
    const regions = createRadialLayout(4);
    const result = await generate(config(regions));
    const map = regionMap(result);

    expect(map).toHaveLength(25);
    expect([...map].every(index => index >= 0 && index < regions.length)).toBe(true);
  });

  it('uses horizontal base regions in north-to-south order', async () => {
    const result = await generate(config(createHorizontalLayout(3), 3, 3));

    expect([...regionMap(result)]).toEqual([0, 0, 0, 1, 1, 1, 2, 2, 2]);
  });

  it('lets a horizontal overlay cut through a radial layout', async () => {
    const regions = [
      ...createRadialLayout(2),
      createBandOverlay('crossing', 'Crossing', 'y', 0.5, 0.2),
    ];
    const result = await generate(config(regions, 5, 5));
    const map = regionMap(result);

    expect([...map.slice(10, 15)]).toEqual([2, 2, 2, 2, 2]);
    expect([...map.slice(0, 5)]).not.toContain(2);
  });

  it('uses the last matching overlay at intersections', async () => {
    const regions = [
      ...createRadialLayout(1),
      createBandOverlay('horizontal', 'Horizontal', 'y', 0.5, 0.4),
      createBandOverlay('vertical', 'Vertical', 'x', 0.5, 0.4),
    ];
    const result = await generate(config(regions, 3, 3));

    expect(regionMap(result)[4]).toBe(2);
  });

  it('expresses radial poles as ordinary overlays', async () => {
    const regions = createRadialPolesLayout(6);
    const result = await generate(config(regions, 3, 5));
    const map = regionMap(result);

    expect([...map.slice(0, 3)]).toEqual([4, 4, 4]);
    expect([...map.slice(12, 15)]).toEqual([5, 5, 5]);
  });

  it('lets overlays override the shared border irregularity', async () => {
    const base = createHorizontalLayout(3);
    const crisp = [
      ...base,
      { ...createBandOverlay('middle', 'Middle', 'y', 0.5, 0.2), irregularity: 0 },
    ];
    const warped = [...base, createBandOverlay('middle', 'Middle', 'y', 0.5, 0.2)];
    const deformation = { amplitude: 0.6 };

    const crispMap = regionMap(
      await generate({ ...config(crisp, 5, 5), macroRegionDeformation: deformation })
    );
    const warpedMap = regionMap(
      await generate({ ...config(warped, 5, 5), macroRegionDeformation: deformation })
    );

    expect([...crispMap.slice(10, 15)]).toEqual([3, 3, 3, 3, 3]);
    expect(warpedMap).not.toEqual(crispMap);
  });

  it('rejects a negative region irregularity', async () => {
    const regions = [
      ...createRadialLayout(1),
      { ...createBandOverlay('bad', 'Bad', 'y', 0.5, 0.2), irregularity: -0.1 },
    ];

    await expect(generate(config(regions))).rejects.toMatchObject({
      cause: { message: expect.stringContaining('irregularity must be zero or greater') },
    });
  });

  it('supports ten regions and rejects an eleventh', async () => {
    await expect(generate(config(createHorizontalLayout(10)))).resolves.toBeDefined();
    await expect(generate(config(createHorizontalLayout(11)))).rejects.toMatchObject({
      cause: { message: 'At most 10 macro regions are allowed.' },
    });
  });

  it('rejects invalid categorical region definitions', async () => {
    const overlayOnly = [createBandOverlay('only', 'Only', 'x')];
    const duplicateIds = createRadialLayout(2).map(region => ({ ...region, id: 'same' }));
    const invalidDanger = createRadialLayout(1).map(region => ({ ...region, danger: 2 }));

    await expect(generate(config(overlayOnly))).rejects.toMatchObject({
      cause: { message: 'At least one base macro region is required.' },
    });
    await expect(generate(config(duplicateIds))).rejects.toMatchObject({
      cause: { message: expect.stringContaining('Duplicate macro region id') },
    });
    await expect(generate(config(invalidDanger))).rejects.toMatchObject({
      cause: { message: expect.stringContaining('danger must be within 0..1') },
    });
  });

  it('is deterministic when borders are deformed', async () => {
    const source = {
      ...config(createRadialLayout(4), 12, 12),
      macroRegionDeformation: { amplitude: 0.2 },
    };

    const first = await generate(source);
    const second = await generate(source);

    expect(first.context.state.macroRegionIdMap).toEqual(second.context.state.macroRegionIdMap);
  });

  it('takes the border displacement from the noise map', async () => {
    const regions = createRadialLayout(4);
    const smooth = await generate({
      ...config(regions, 12, 12),
      noise: { frequency: 2, octaves: 3, persistence: 0.5, lacunarity: 2 },
      macroRegionDeformation: { amplitude: 0.3, source: 'noise-map' },
    });
    const detailed = await generate({
      ...config(regions, 12, 12),
      noise: { frequency: 6, octaves: 3, persistence: 0.5, lacunarity: 2 },
      macroRegionDeformation: { amplitude: 0.3, source: 'noise-map' },
    });

    expect(detailed.context.state.macroRegionIdMap).not.toEqual(
      smooth.context.state.macroRegionIdMap
    );
  });

  it('keeps dedicated borders independent of NoiseStage settings', async () => {
    const regions = createRadialLayout(4);
    const base = config(regions, 12, 12);
    const smooth = await generate({
      ...base,
      macroRegionDeformation: { amplitude: 0.2 },
      noise: { ...noise, frequency: 2 },
    });
    const detailed = await generate({
      ...base,
      macroRegionDeformation: { amplitude: 0.2 },
      noise: { ...noise, frequency: 6 },
    });

    expect(detailed.context.state.macroRegionIdMap).toEqual(smooth.context.state.macroRegionIdMap);
  });

  it('keeps deformed borders inside the world mask', async () => {
    const regions = createRadialLayout(3);
    const mask = new Uint8Array(25);
    for (let index = 0; index < mask.length; index++) {
      mask[index] = index % 5 === 0 ? 0 : 1;
    }
    const result = await generate(
      { ...config(regions, 5, 5), macroRegionDeformation: { amplitude: 0.4 } },
      mask
    );
    const map = regionMap(result);

    for (let index = 0; index < map.length; index++) {
      if (mask[index] === 0) {
        expect(map[index]).toBe(0);
      }
    }
  });

  it('leaves cells outside the world shape at zero', async () => {
    const regions = createHorizontalLayout(3);
    const outsideMiddleRow = new Uint8Array([1, 1, 1, 0, 0, 0, 1, 1, 1]);
    const result = await generate(config(regions, 3, 3), outsideMiddleRow);

    expect([...regionMap(result)]).toEqual([0, 0, 0, 0, 0, 0, 2, 2, 2]);
  });

  it('requires a valid world mask', async () => {
    const pipeline = new MapGenerator<MapConfig, MapState>([new MacroRegionStage()]);
    const source = config(createRadialLayout(2), 3, 3);

    await expect(
      pipeline.generate(source, { noiseMap: new Float32Array(9) })
    ).rejects.toMatchObject({
      cause: { message: expect.stringContaining('world mask') },
    });
  });

  it('requires a valid noise map', async () => {
    const pipeline = new MapGenerator<MapConfig, MapState>([new MacroRegionStage()]);
    const source = {
      ...config(createRadialLayout(2), 3, 3),
      macroRegionDeformation: { amplitude: 0.1, source: 'noise-map' as const },
    };

    await expect(
      pipeline.generate(source, { worldMask: new Uint8Array(9).fill(1) })
    ).rejects.toMatchObject({
      cause: { message: expect.stringContaining('noise map') },
    });
  });

  it('generates dedicated borders without a noise map', async () => {
    const pipeline = new MapGenerator<MapConfig, MapState>([new MacroRegionStage()]);
    const source = {
      ...config(createRadialLayout(2), 3, 3),
      macroRegionDeformation: { amplitude: 0.1 },
    };

    const result = await pipeline.generate(source, { worldMask: new Uint8Array(9).fill(1) });

    expect(result.context.state.macroRegionIdMap).toHaveLength(9);
  });

  it('validates output size and reports region counts', async () => {
    const stage = new MacroRegionStage();
    const source = config(createRadialPolesLayout(6), 4, 3);
    const result = await generate(source);

    expect(() => stage.validate({}, source)).toThrow('required map data');
    expect(() =>
      stage.validate(
        { worldMask: new Uint8Array(12), macroRegionIdMap: new Uint8Array(12) },
        source
      )
    ).not.toThrow();
    expect(() => stage.validate({ macroRegionIdMap: new Uint8Array(12) }, source)).toThrow(
      'required map data'
    );
    expect(result.statistics[1].details).toEqual({
      regions: 6,
      overlays: 2,
      deformationAmplitude: 0,
      deformationSource: 'dedicated',
      bytes: 12,
    });
  });
});
