import { DEFAULT_LANDMASS_CONFIG } from './stages/landmass-defaults';
import { createRadialLayout } from './stages/macro-region-presets';
import { selectDirtyStageIds } from './selective-regeneration';
import type { MapConfig } from './types';

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
};

describe('selectDirtyStageIds', () => {
  it('marks every stage dirty on the first run', () => {
    expect(selectDirtyStageIds(undefined, config)).toEqual([
      'world-shape',
      'noise',
      'macro-region',
      'landmass-layout',
    ]);
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
    };

    expect(selectDirtyStageIds(config, copy)).toEqual([]);
  });

  it('rebuilds from the first stage whose configuration slice changed', () => {
    const cases: ReadonlyArray<readonly [Partial<MapConfig>, readonly string[]]> = [
      [
        { world: { ...config.world, shape: 'rectangle' } },
        ['world-shape', 'noise', 'macro-region', 'landmass-layout'],
      ],
      [
        {
          world: {
            ...config.world,
            dimensions: { widthMeters: 4, heightMeters: 4, sampleWidth: 4, sampleHeight: 4 },
          },
        },
        ['world-shape', 'noise', 'macro-region', 'landmass-layout'],
      ],
      [{ world: { ...config.world, seed: 18 } }, ['noise', 'macro-region', 'landmass-layout']],
      [{ noise: { ...config.noise, frequency: 5 } }, ['noise', 'macro-region', 'landmass-layout']],
      [{ macroRegions: createRadialLayout(3) }, ['macro-region', 'landmass-layout']],
      [
        { macroRegionDeformation: { amplitude: 0.2, source: 'noise-map' } },
        ['macro-region', 'landmass-layout'],
      ],
      [{ landmasses: { ...DEFAULT_LANDMASS_CONFIG, count: 3 } }, ['landmass-layout']],
    ];

    for (const [patch, expected] of cases) {
      expect(selectDirtyStageIds(config, { ...config, ...patch })).toEqual(expected);
    }
  });

  it('treats a removed optional slice as a change', () => {
    const withoutRegions: MapConfig = { ...config, macroRegions: undefined };

    expect(selectDirtyStageIds(config, withoutRegions)).toEqual([
      'macro-region',
      'landmass-layout',
    ]);
  });
});
