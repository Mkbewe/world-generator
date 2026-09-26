import { validateZones } from './character-check';
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

const LANDMASSES = {
  count: 3,
  size: 0.5,
  diversity: 0.3,
  shelf: { width: 0.05, targetDepth: 0.3, falloff: 0.5, irregularity: 0.3 },
};

function config(character: Partial<StructureCharacterConfig> = {}): MapConfig {
  return {
    ...base,
    landmasses: LANDMASSES,
    structureCharacter: { ...DEFAULT_STRUCTURE_CHARACTER_CONFIG, ...character },
  };
}

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

describe('StructureCharacterStage', () => {
  it('assigns one whole zone per structure and validates cleanly', async () => {
    const result = await generate();
    const { structureZones, landmassLayout } = result.context.state;

    expect(structureZones?.filter(zone => zone.geometry.kind === 'whole')).toHaveLength(3);
    if (!structureZones || !landmassLayout) {
      return;
    }
    expect(() => validateZones(structureZones, landmassLayout, base.world.shape)).not.toThrow();
  });

  it('is deterministic per seed', async () => {
    const first = await generate();
    const second = await generate();

    expect(second.context.state.structureZones).toEqual(first.context.state.structureZones);
  });

  it('changes output when the seed changes', async () => {
    const first = await generate();
    const other = await generate({ ...config(), world: { ...base.world, seed: 42 } });

    expect(other.context.state.structureZones).not.toEqual(first.context.state.structureZones);
  });

  it('returns empty zones for an empty layout', async () => {
    const result = await generateFromLayout(EMPTY_LAYOUT);

    expect(result.context.state.structureZones).toEqual([]);
  });

  it('reports zone counts via summarize', async () => {
    const result = await generate();
    const stats = result.statistics.find(candidate => candidate.stageId === 'structure-character');

    expect(stats?.details?.zones).toBeGreaterThanOrEqual(3);
    expect(typeof stats?.details?.splits).toBe('number');
  });

  it('requires a landmass layout', async () => {
    const pipeline = new MapGenerator<MapConfig, MapState>([new StructureCharacterStage()]);

    await expect(pipeline.generate(config(), { worldMask: WORLD_MASK })).rejects.toMatchObject({
      cause: { message: expect.stringContaining('missing input "landmassLayout"') },
    });
  });

  it('rejects invalid configuration', async () => {
    const cases: Array<Partial<StructureCharacterConfig>> = [
      { characterVariation: -0.1 },
      { characterVariation: 1.1 },
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
    expect(() => stage.validate({ landmassLayout: EMPTY_LAYOUT }, config())).toThrow(
      'required map data'
    );
  });

  it('validate() passes for an empty layout with empty zones', () => {
    const stage = new StructureCharacterStage();

    expect(() =>
      stage.validate({ landmassLayout: EMPTY_LAYOUT, structureZones: [] }, config())
    ).not.toThrow();
  });

  it('validate() rejects two whole zones for one structure', () => {
    const stage = new StructureCharacterStage();
    const layout: LandmassLayout = {
      structures: [
        {
          id: 'a',
          archetype: 'round',
          nodes: [{ id: 'a-n1', position: { x: 0.5, y: 0.5 }, radius: 0.1 }],
          edges: [],
          shelfId: 'shelf-1',
        },
      ],
      shelves: [],
    };
    const values = {
      elevation: 0.5,
      roughness: 0.5,
      mountainStrength: 0.5,
      hillStrength: 0.5,
      plateauStrength: 0.5,
      lakePotential: 0.5,
      erosionStrength: 0.5,
      coastalCliffStrength: 0.5,
    };
    const zones = [
      {
        id: 'a-zone-1',
        structureId: 'a',
        character: 'plains' as const,
        geometry: { kind: 'whole' as const },
        values,
      },
      {
        id: 'a-zone-2',
        structureId: 'a',
        character: 'hills' as const,
        geometry: { kind: 'whole' as const },
        values,
      },
    ];

    expect(() =>
      stage.validate({ landmassLayout: layout, structureZones: zones }, config())
    ).toThrow('exactly one whole');
  });
});
