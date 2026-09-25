import { validateCharacter } from './character-check';
import { DEFAULT_STRUCTURE_CHARACTER_CONFIG } from './defaults';
import { StructureCharacterStage } from './stage';
import { MapGenerator } from '../../pipeline/pipeline';
import type { LandmassLayout, MapConfig, MapState, StructureCharacterConfig } from '../../types';
import { LandmassLayoutStage } from '../landmass';

const base: MapConfig = {
  world: {
    dimensions: { widthMeters: 2000, heightMeters: 2000, sampleWidth: 4, sampleHeight: 4 },
    seed: 17,
    shape: 'disc',
  },
  noise: { frequency: 4, octaves: 2, persistence: 0.5, lacunarity: 2 },
};

function config(character: Partial<StructureCharacterConfig> = {}): MapConfig {
  return {
    ...base,
    landmasses: DEFAULT_LANDMASS_CONFIG_3,
    structureCharacter: { ...DEFAULT_STRUCTURE_CHARACTER_CONFIG, ...character },
  };
}

const DEFAULT_LANDMASS_CONFIG_3 = {
  count: 3,
  size: 0.5,
  diversity: 0.3,
  shelf: { width: 0.05, targetDepth: 0.3, falloff: 0.5, irregularity: 0.3 },
};

const WORLD_MASK = new Uint8Array(16).fill(1);

/** Runs LandmassLayoutStage then StructureCharacterStage. */
async function generate(source: MapConfig = config()) {
  return new MapGenerator<MapConfig, MapState>([
    new LandmassLayoutStage(),
    new StructureCharacterStage(),
  ]).generate(source, { worldMask: WORLD_MASK });
}

/** Injects a fixed layout instead of running the landmass stage. */
async function generateFromLayout(
  layout: LandmassLayout,
  character?: Partial<StructureCharacterConfig>
) {
  return new MapGenerator<MapConfig, MapState>([new StructureCharacterStage()]).generate(
    config(character),
    { worldMask: WORLD_MASK, landmassLayout: layout }
  );
}

const EMPTY_LAYOUT: LandmassLayout = { structures: [], shelves: [] };

/** One structure comfortably above the region extent threshold. */
const LARGE_LAYOUT: LandmassLayout = {
  structures: [
    {
      id: 'large-land',
      archetype: 'elongated',
      nodes: [
        { id: 'large-land-n1', position: { x: 0.3, y: 0.5 }, radius: 0.05 },
        { id: 'large-land-n2', position: { x: 0.7, y: 0.5 }, radius: 0.05 },
      ],
      edges: [{ id: 'large-land-e1', from: 'large-land-n1', to: 'large-land-n2' }],
      shelfId: 'shelf-1',
    },
  ],
  shelves: [],
};

describe('StructureCharacterStage', () => {
  it('assigns one profile per structure and validates cleanly', async () => {
    const result = await generate();
    const { structureProfiles, structureRegions, landmassLayout } = result.context.state;

    expect(structureProfiles).toHaveLength(3);
    expect(landmassLayout).toBeDefined();
    if (!structureProfiles || !structureRegions || !landmassLayout) {
      return;
    }
    expect(() =>
      validateCharacter(structureProfiles, structureRegions, landmassLayout, base.world.shape)
    ).not.toThrow();
  });

  it('is deterministic per seed', async () => {
    const first = await generate();
    const second = await generate();

    expect(second.context.state.structureProfiles).toEqual(first.context.state.structureProfiles);
    expect(second.context.state.structureRegions).toEqual(first.context.state.structureRegions);
  });

  it('changes output when the seed changes', async () => {
    const first = await generate();
    const other = await generate({ ...config(), world: { ...base.world, seed: 42 } });

    expect(other.context.state.structureProfiles).not.toEqual(
      first.context.state.structureProfiles
    );
  });

  it('returns empty arrays for an empty layout', async () => {
    const result = await generateFromLayout(EMPTY_LAYOUT);

    expect(result.context.state.structureProfiles).toEqual([]);
    expect(result.context.state.structureRegions).toEqual([]);
  });

  it('keeps a large structure uniform at zero region density', async () => {
    const result = await generateFromLayout(LARGE_LAYOUT, { regionDensity: 0 });

    expect(result.context.state.structureRegions).toEqual([]);
  });

  it('grows regions for a large structure above zero density', async () => {
    const result = await generateFromLayout(LARGE_LAYOUT, { regionDensity: 0.5 });

    expect(result.context.state.structureRegions?.length).toBeGreaterThan(0);
  });

  it('reports profile and region counts via summarize', async () => {
    const result = await generate();
    const stats = result.statistics.find(s => s.stageId === 'structure-character');

    expect(stats?.details).toMatchObject({ profiles: 3 });
    expect(typeof stats?.details?.regions).toBe('number');
  });

  it('requires a landmass layout', async () => {
    const pipeline = new MapGenerator<MapConfig, MapState>([new StructureCharacterStage()]);

    await expect(pipeline.generate(config(), { worldMask: WORLD_MASK })).rejects.toMatchObject({
      cause: { message: expect.stringContaining('missing input "landmassLayout"') },
    });
  });

  it('keeps every region center inside the world shape at the edge', async () => {
    const edge: LandmassLayout = {
      structures: [
        {
          id: 'edge-land',
          archetype: 'elongated',
          nodes: [
            { id: 'edge-land-n1', position: { x: 0.75, y: 0.5 }, radius: 0.1 },
            { id: 'edge-land-n2', position: { x: 0.95, y: 0.5 }, radius: 0.1 },
          ],
          edges: [{ id: 'edge-land-e1', from: 'edge-land-n1', to: 'edge-land-n2' }],
          shelfId: 'shelf-1',
        },
      ],
      shelves: [],
    };
    const result = await generateFromLayout(edge);

    expect(result.context.state.structureRegions?.length).toBeGreaterThan(0);
    for (const region of result.context.state.structureRegions ?? []) {
      const x = 2 * region.center.x - 1;
      const y = 2 * region.center.y - 1;
      expect(x * x + y * y).toBeLessThanOrEqual(1);
    }
  });

  it('rejects invalid configuration', async () => {
    const cases: Array<Partial<StructureCharacterConfig>> = [
      { profileVariation: -0.1 },
      { profileVariation: 1.1 },
      { regionDensity: -0.1 },
      { regionDensity: 1.1 },
    ];

    for (const overrides of cases) {
      await expect(generateFromLayout(EMPTY_LAYOUT, overrides)).rejects.toMatchObject({
        cause: { name: 'RangeError' },
      });
    }
  });

  it('validate() throws without required state', () => {
    const stage = new StructureCharacterStage();

    expect(() => stage.validate({}, config())).toThrow('required map data');
    expect(() =>
      stage.validate({ landmassLayout: EMPTY_LAYOUT, structureProfiles: [] }, config())
    ).toThrow('required map data');
  });

  it('validate() passes for an empty layout with empty outputs', () => {
    const stage = new StructureCharacterStage();

    expect(() =>
      stage.validate(
        { landmassLayout: EMPTY_LAYOUT, structureProfiles: [], structureRegions: [] },
        config()
      )
    ).not.toThrow();
  });
});
