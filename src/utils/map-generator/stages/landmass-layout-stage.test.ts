import { DEFAULT_LANDMASS_CONFIG, MAX_LANDMASSES } from './landmass-defaults';
import { LandmassLayoutStage } from './landmass-layout-stage';
import { MapGenerator } from '../pipeline';
import type { LandmassArchetype, MapConfig, MapState } from '../types';

const base: MapConfig = {
  world: {
    dimensions: { widthMeters: 2, heightMeters: 2, sampleWidth: 4, sampleHeight: 4 },
    seed: 17,
    shape: 'disc',
  },
  noise: { frequency: 4, octaves: 2, persistence: 0.5, lacunarity: 2 },
};

function config(overrides: Partial<MapConfig['landmasses']> = {}): MapConfig {
  return {
    ...base,
    landmasses: { ...DEFAULT_LANDMASS_CONFIG, ...overrides },
  };
}

async function generate(source: MapConfig = base) {
  return new MapGenerator<MapConfig, MapState>([new LandmassLayoutStage()]).generate(source, {
    worldMask: new Uint8Array(16).fill(1),
  });
}

describe('LandmassLayoutStage', () => {
  it('produces an empty layout until the new graph model lands', async () => {
    const result = await generate();

    expect(result.context.state.landmassLayout).toEqual({ landmasses: [], shelves: [] });
    expect(result.statistics[0].details).toMatchObject({ structures: 0, shelves: 0 });
  });

  it('requires a valid world mask', async () => {
    const pipeline = new MapGenerator<MapConfig, MapState>([new LandmassLayoutStage()]);

    await expect(pipeline.generate(base, {})).rejects.toMatchObject({
      cause: { message: expect.stringContaining('world mask') },
    });
  });

  it('rejects invalid configuration', async () => {
    const cases: ReadonlyArray<Partial<MapConfig['landmasses']>> = [
      { count: 0 },
      { count: MAX_LANDMASSES + 1 },
      { size: 0.1 },
      { archetypes: ['spiral' as LandmassArchetype] },
      { irregularity: 2 },
      { shelf: { ...DEFAULT_LANDMASS_CONFIG.shelf, falloff: 2 } },
      { shelf: { ...DEFAULT_LANDMASS_CONFIG.shelf, width: 0 } },
    ];

    for (const overrides of cases) {
      await expect(generate(config(overrides))).rejects.toMatchObject({
        cause: { name: 'RangeError' },
      });
    }
  });
});
