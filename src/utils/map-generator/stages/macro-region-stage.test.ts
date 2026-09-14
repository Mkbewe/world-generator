import {
  createBandOverlay,
  createHorizontalLayout,
  createRadialLayout,
  createRadialPolesLayout,
} from './macro-region-presets';
import { MacroRegionStage } from './macro-region-stage';
import { MapGenerator } from '../pipeline';
import type { MacroRegionConfig, MapConfig, MapState } from '../types';

const noise = { frequency: 4, octaves: 3, persistence: 0.5, lacunarity: 2 };

function config(macroRegions: readonly MacroRegionConfig[], width = 5, height = 5): MapConfig {
  return {
    world: { width, height, seed: 123 },
    noise,
    macroRegions,
    macroRegionDeformation: { amplitude: 0 },
  };
}

async function generate(source: MapConfig) {
  const pipeline = new MapGenerator<MapConfig, MapState>([new MacroRegionStage()]);
  return pipeline.generate(source, {});
}

describe('MacroRegionStage', () => {
  it('assigns one valid region index to every cell', async () => {
    const regions = createRadialLayout(4);
    const result = await generate(config(regions));
    const map = result.context.state.macroRegionIdMap!;

    expect(map).toHaveLength(25);
    expect([...map].every(index => index >= 0 && index < regions.length)).toBe(true);
  });

  it('uses horizontal base regions in north-to-south order', async () => {
    const result = await generate(config(createHorizontalLayout(3), 3, 3));

    expect([...result.context.state.macroRegionIdMap!]).toEqual([0, 0, 0, 1, 1, 1, 2, 2, 2]);
  });

  it('lets a horizontal overlay cut through a radial layout', async () => {
    const regions = [
      ...createRadialLayout(2),
      createBandOverlay('crossing', 'Crossing', 'y', 0.5, 0.2),
    ];
    const result = await generate(config(regions, 5, 5));
    const map = result.context.state.macroRegionIdMap!;

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

    expect(result.context.state.macroRegionIdMap![4]).toBe(2);
  });

  it('expresses radial poles as ordinary overlays', async () => {
    const regions = createRadialPolesLayout(6);
    const result = await generate(config(regions, 3, 5));
    const map = result.context.state.macroRegionIdMap!;

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
    const deformation = { amplitude: 0.6, frequency: 4, octaves: 3, seed: 'overlay-borders' };

    const crispMap = (
      await generate({ ...config(crisp, 5, 5), macroRegionDeformation: deformation })
    ).context.state.macroRegionIdMap!;
    const warpedMap = (
      await generate({ ...config(warped, 5, 5), macroRegionDeformation: deformation })
    ).context.state.macroRegionIdMap!;

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
      macroRegionDeformation: { amplitude: 0.2, frequency: 4, octaves: 3, seed: 'borders' },
    };

    const first = await generate(source);
    const second = await generate(source);

    expect(first.context.state.macroRegionIdMap).toEqual(second.context.state.macroRegionIdMap);
  });

  it('validates output size and reports region counts', async () => {
    const stage = new MacroRegionStage();
    const source = config(createRadialPolesLayout(6), 4, 3);
    const result = await generate(source);

    expect(() => stage.validate({}, source)).toThrow('required map data');
    expect(() => stage.validate({ macroRegionIdMap: new Uint8Array(12) }, source)).not.toThrow();
    expect(result.statistics[0].details).toEqual({
      regions: 6,
      overlays: 2,
      deformationAmplitude: 0,
      deformationFrequency: 3,
      deformationOctaves: 2,
      bytes: 12,
    });
  });
});
