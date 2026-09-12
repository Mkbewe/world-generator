import { MacroRegionStage } from './macro-region-stage';
import { MapGenerator } from '../pipeline';
import type { MapConfig, MapState } from '../types';

const ZERO_DEFORMATION = { amplitude: 0 } as const;

function createConfig(width = 5, height = 5, shape: 'disc' | 'rectangle' = 'disc'): MapConfig {
  return {
    world: { width, height, seed: 123, shape },
    noise: { frequency: 4, octaves: 3, persistence: 0.5, lacunarity: 2 },
  };
}

async function generate(config: MapConfig): Promise<MapState> {
  const pipeline = new MapGenerator<MapConfig, MapState>([new MacroRegionStage()]);
  return (await pipeline.generate(config, {})).context.state;
}

describe('MacroRegionStage', () => {
  it('produces a progression field and region ids for every cell', async () => {
    const state = await generate(createConfig(8, 6));

    expect(state.progressionMap).toHaveLength(48);
    expect(state.progressionMap!.every(value => value >= 0 && value <= 1)).toBe(true);
    expect(state.macroRegionIdMap).toHaveLength(48);
    expect(state.macroRegionIdMap!.every(id => id < 4)).toBe(true);
  });

  it('grows progression from the safe centre towards the rim', async () => {
    const state = await generate({
      ...createConfig(9, 9),
      macroRegionDeformation: ZERO_DEFORMATION,
    });
    const map = state.progressionMap!;
    const centre = map[4 * 9 + 4];
    const edge = map[4 * 9 + 8];

    expect(centre).toBeLessThan(edge);
    expect(centre).toBeCloseTo(0, 1);
    expect(edge).toBeGreaterThan(0.7);
  });

  it('shows every default region inside a disc', async () => {
    const state = await generate({
      ...createConfig(9, 9, 'disc'),
      macroRegionDeformation: ZERO_DEFORMATION,
    });

    expect([...new Set(state.macroRegionIdMap!)].sort()).toEqual([0, 1, 2, 3]);
    expect(Math.max(...state.progressionMap!)).toBe(1);
  });

  it('is independent of the world shape', async () => {
    const disc = await generate(createConfig(5, 5, 'disc'));
    const rectangle = await generate(createConfig(5, 5, 'rectangle'));

    expect(rectangle.progressionMap).toEqual(disc.progressionMap);
    expect(rectangle.macroRegionIdMap).toEqual(disc.macroRegionIdMap);
  });

  it('blends configured regions smoothly', async () => {
    const config: MapConfig = {
      ...createConfig(5, 1),
      macroRegionDeformation: ZERO_DEFORMATION,
      macroRegions: [
        {
          id: 'west',
          label: 'West',
          center: { x: 0, y: 0 },
          radius: 0.5,
          falloff: 0.25,
          progression: 0,
        },
        {
          id: 'east',
          label: 'East',
          center: { x: 1, y: 0 },
          radius: 0.5,
          falloff: 0.25,
          progression: 1,
        },
      ],
    };

    const map = (await generate(config)).progressionMap!;

    expect(map[0]).toBeLessThan(0.2);
    expect(map[4]).toBeGreaterThan(0.8);
    expect(map[2]).toBeGreaterThan(map[1]);
    expect(map[2]).toBeLessThan(map[3]);
  });

  it('deforms region borders with its own deterministic noise', async () => {
    const base = createConfig(33, 33);
    const deformation = { amplitude: 0.08, frequency: 4, octaves: 2, seed: 'warp' };
    const warped = await generate({ ...base, macroRegionDeformation: deformation });
    const again = await generate({ ...base, macroRegionDeformation: deformation });
    const straight = await generate({ ...base, macroRegionDeformation: ZERO_DEFORMATION });
    const otherSeed = await generate({
      ...base,
      macroRegionDeformation: { ...deformation, seed: 'other' },
    });

    expect(again.progressionMap).toEqual(warped.progressionMap);
    expect(warped.progressionMap).not.toEqual(straight.progressionMap);
    expect(otherSeed.progressionMap).not.toEqual(warped.progressionMap);

    const size = 33;
    const center = 16;
    const ring = (map: Float32Array) => [
      map[center * size + center + 8],
      map[center * size + center - 8],
      map[(center + 8) * size + center],
      map[(center - 8) * size + center],
    ];

    expect(new Set(ring(straight.progressionMap!)).size).toBe(1);
    expect(new Set(ring(warped.progressionMap!)).size).toBeGreaterThan(1);
  });

  it('rejects invalid deformation configuration', async () => {
    const pipeline = new MapGenerator<MapConfig, MapState>([new MacroRegionStage()]);

    await expect(
      pipeline.generate({ ...createConfig(), macroRegionDeformation: { amplitude: -1 } }, {})
    ).rejects.toMatchObject({
      name: 'GenerationStageError',
      cause: expect.any(RangeError),
    });
  });

  it('rejects invalid region configuration', async () => {
    const config: MapConfig = {
      ...createConfig(),
      macroRegions: [
        {
          id: 'bad',
          label: 'Bad',
          center: { x: 0.5, y: 0.5 },
          radius: 0,
          falloff: 0.1,
          progression: 0.5,
        },
      ],
    };
    const pipeline = new MapGenerator<MapConfig, MapState>([new MacroRegionStage()]);

    await expect(pipeline.generate(config, {})).rejects.toMatchObject({
      name: 'GenerationStageError',
      cause: expect.any(RangeError),
    });
  });

  it('validates the generated maps', () => {
    const stage = new MacroRegionStage();
    const config = createConfig();

    expect(() => stage.validate({}, config)).toThrow('required map data');
    expect(() =>
      stage.validate(
        { progressionMap: new Float32Array(3), macroRegionIdMap: new Uint8Array(4) },
        config
      )
    ).toThrow('required map data');
    expect(() =>
      stage.validate(
        { progressionMap: new Float32Array(25), macroRegionIdMap: new Uint8Array(25) },
        config
      )
    ).not.toThrow();
  });

  it('summarizes the generated regions', async () => {
    const pipeline = new MapGenerator<MapConfig, MapState>([new MacroRegionStage()]);

    const result = await pipeline.generate(
      { ...createConfig(8, 6), macroRegionDeformation: ZERO_DEFORMATION },
      {}
    );
    const details = result.statistics[0].details;

    expect(details).toMatchObject({ regions: 4, max: 1, bytes: 48 * 4 + 48 });
    expect(details?.min).toBeGreaterThanOrEqual(0);
    expect(details?.mean).toBeGreaterThan(0);
  });
});
