import { selectDirtyStageIds } from './selective-regeneration';
import { PIPELINE_STAGES } from './stage-definitions';
import { DEFAULT_GEOLOGY_CONFIG } from '../stages/geology';
import { createRadialLayout } from '../stages/macro-region';
import type { MapConfig } from '../types';

const deformation = { amplitude: 0.1 } as const;
const geology = DEFAULT_GEOLOGY_CONFIG;

const config: MapConfig = {
  world: {
    dimensions: { widthMeters: 2, heightMeters: 2, sampleWidth: 2, sampleHeight: 2 },
    seed: 17,
    shape: 'disc',
  },
  macroRegions: createRadialLayout(2),
  macroRegionDeformation: deformation,
  geology,
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
      macroRegions: createRadialLayout(2).map(region => ({ ...region })),
      macroRegionDeformation: { ...deformation },
      geology: {
        ...geology,
        layout: { ...geology.layout },
        regions: geology.regions.map(region => ({ ...region })),
      },
    };

    expect(selectDirtyStageIds(config, copy)).toEqual([]);
  });

  it('rebuilds only the stages whose configuration slice changed', () => {
    const cases: ReadonlyArray<readonly [Partial<MapConfig>, readonly string[]]> = [
      [
        { world: { ...config.world, shape: 'rectangle' } },
        ['world-shape', 'macro-region', 'geology'],
      ],
      [
        {
          world: {
            ...config.world,
            dimensions: { widthMeters: 4, heightMeters: 4, sampleWidth: 4, sampleHeight: 4 },
          },
        },
        ['world-shape', 'macro-region', 'geology'],
      ],
      [
        {
          world: {
            ...config.world,
            dimensions: { ...config.world.dimensions, sampleWidth: 4, sampleHeight: 4 },
          },
        },
        ['world-shape', 'macro-region', 'geology'],
      ],
      [{ world: { ...config.world, seed: 18 } }, ['macro-region', 'geology']],
      [{ macroRegions: createRadialLayout(3) }, ['macro-region']],
      [{ macroRegionDeformation: { amplitude: 0.2 } }, ['macro-region']],
      [{ geology: { ...geology, regionCount: 6 } }, ['geology']],
    ];

    for (const [patch, expected] of cases) {
      expect(selectDirtyStageIds(config, { ...config, ...patch })).toEqual(expected);
    }
  });

  it('keeps geology clean when macro regions change', () => {
    const regions = selectDirtyStageIds(config, { ...config, macroRegions: createRadialLayout(3) });

    expect(regions).toEqual(['macro-region']);
  });

  it('treats a removed optional slice as a change', () => {
    const withoutRegions: MapConfig = { ...config, macroRegions: undefined };

    expect(selectDirtyStageIds(config, withoutRegions)).toEqual(['macro-region']);
  });
});
