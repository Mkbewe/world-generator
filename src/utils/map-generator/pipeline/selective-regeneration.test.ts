import { selectDirtyStageIds } from './selective-regeneration';
import { PIPELINE_STAGES } from './stage-definitions';
import { createGeologicalArea } from '../stages/geology';
import { createRadialLayout } from '../stages/macro-region';
import type { MapConfig } from '../types';

const deformation = { amplitude: 0.1, source: 'dedicated' } as const;

const config: MapConfig = {
  world: {
    dimensions: { widthMeters: 2, heightMeters: 2, sampleWidth: 2, sampleHeight: 2 },
    seed: 17,
    shape: 'disc',
  },
  noise: { frequency: 4, octaves: 4, persistence: 0.5, lacunarity: 2 },
  macroRegions: createRadialLayout(2),
  macroRegionDeformation: deformation,
  geology: { areas: [createGeologicalArea('area-1', 'shallow-archipelago')] },
};

describe('selectDirtyStageIds', () => {
  it('marks every stage dirty on the first run', () => {
    expect(selectDirtyStageIds(undefined, config)).toEqual(PIPELINE_STAGES.map(stage => stage.id));
  });

  it('keeps every stage clean for an unchanged configuration', () => {
    expect(selectDirtyStageIds(config, { ...config })).toEqual([]);
  });

  it('compares the declared slices structurally, not by reference', () => {
    const copy: MapConfig = {
      ...config,
      world: { ...config.world, dimensions: { ...config.world.dimensions } },
      noise: { ...config.noise },
      macroRegions: createRadialLayout(2).map(region => ({ ...region })),
      macroRegionDeformation: { ...deformation },
      geology: { areas: (config.geology?.areas ?? []).map(area => ({ ...area })) },
    };

    expect(selectDirtyStageIds(config, copy)).toEqual([]);
  });

  it('rebuilds only the stages whose configuration slice changed', () => {
    const cases: ReadonlyArray<readonly [Partial<MapConfig>, readonly string[]]> = [
      [
        { world: { ...config.world, shape: 'rectangle' } },
        ['world-shape', 'noise', 'macro-region', 'geology', 'heightmap'],
      ],
      [
        {
          world: {
            ...config.world,
            dimensions: { widthMeters: 4, heightMeters: 4, sampleWidth: 4, sampleHeight: 4 },
          },
        },
        ['world-shape', 'noise', 'macro-region', 'heightmap'],
      ],
      [{ world: { ...config.world, seed: 18 } }, ['noise', 'macro-region', 'geology', 'heightmap']],
      [{ noise: { ...config.noise, frequency: 5 } }, ['noise']],
      [{ macroRegions: createRadialLayout(3) }, ['macro-region']],
      [{ macroRegionDeformation: { amplitude: 0.2, source: 'noise-map' } }, ['macro-region']],
      [
        { geology: { areas: [createGeologicalArea('area-2', 'volcanic')] } },
        ['geology', 'heightmap'],
      ],
      [{ heightmap: { relief: 0.9, featureScale: 0.5 } }, ['heightmap']],
    ];

    for (const [patch, expected] of cases) {
      expect(selectDirtyStageIds(config, { ...config, ...patch })).toEqual(expected);
    }
  });

  it('ignores the removed corridor configuration slices', () => {
    expect(selectDirtyStageIds(config, { ...config, landmasses: undefined })).toEqual([]);
    expect(selectDirtyStageIds(config, { ...config, structureCharacter: undefined })).toEqual([]);
  });

  it('follows the noise raster only under the noise-map border source', () => {
    const noiseMap = {
      ...config,
      macroRegionDeformation: { amplitude: 0.1, source: 'noise-map' } as const,
    };
    const changedNoise: MapConfig = {
      ...noiseMap,
      noise: { ...noiseMap.noise, frequency: 5 },
    };

    expect(selectDirtyStageIds(noiseMap, changedNoise)).toEqual(['noise', 'macro-region']);
    expect(selectDirtyStageIds(changedNoise, noiseMap)).toEqual(['noise', 'macro-region']);
  });

  it('leaves the geology stage out of changes it does not read', () => {
    const regions = selectDirtyStageIds(config, { ...config, macroRegions: createRadialLayout(3) });
    const noise = selectDirtyStageIds(config, {
      ...config,
      noise: { ...config.noise, octaves: 6 },
    });

    expect(regions).not.toContain('geology');
    expect(noise).not.toContain('geology');
  });

  it('treats a removed optional slice as a change', () => {
    const withoutRegions: MapConfig = { ...config, macroRegions: undefined };

    expect(selectDirtyStageIds(config, withoutRegions)).toEqual(['macro-region']);
  });
});
