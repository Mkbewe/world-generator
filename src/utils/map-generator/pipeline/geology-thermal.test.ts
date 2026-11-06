import { createMapGenerator } from './pipeline-factory';
import { DEFAULT_BASE_CLIMATE_CONFIG } from '../stages/base-climate';
import type { GeologicalRegionType, HeatZoneClass, MapConfig } from '../types';

const WORLD: MapConfig['world'] = {
  dimensions: { widthMeters: 4000, heightMeters: 2000, sampleWidth: 64, sampleHeight: 32 },
  seed: 17,
  shape: 'disc',
};

const ZONE = {
  id: 'zone',
  label: 'Zone',
  geometry: { kind: 'band', axis: 'y', center: 0.5, width: 1 },
} as const;

function geology(regionCount = 1, type: GeologicalRegionType = 'lagoon') {
  return {
    regionCount,
    layout: { evenness: 0.4, irregularity: 0.25 },
    regions: Array.from({ length: regionCount }, () => ({ type, size: 1 })),
  };
}

function config(
  geologyCoupling: number,
  thermal: HeatZoneClass = 'cold',
  geologyConfig = geology()
): MapConfig {
  return {
    world: WORLD,
    baseClimate: {
      ...DEFAULT_BASE_CLIMATE_CONFIG,
      geologyCoupling,
      zones: [{ ...ZONE, thermal }],
    },
    geology: geologyConfig,
  };
}

describe('BaseClimate geology coupling', () => {
  it.each(['cold', 'temperate', 'warm'] as const)(
    'samples the %s class at the region centre',
    async thermal => {
      const result = await createMapGenerator().generate(config(1, thermal), {});

      expect(result.context.state.geologyPlan?.regions[0]?.thermal).toBe(thermal);
    }
  );

  it('changes the heightmap when coupling follows the zone', async () => {
    const followed = await createMapGenerator().generate(config(1), {});
    const original = await createMapGenerator().generate(config(0), {});

    expect(followed.context.state.heightmap).not.toEqual(original.context.state.heightmap);
  });

  it('is deterministic for the same coupling', async () => {
    const first = await createMapGenerator().generate(config(1), {});
    const second = await createMapGenerator().generate(config(1), {});

    expect(first.context.state.heightmap).toEqual(second.context.state.heightmap);
  });

  it('keeps region anchors stable when the thermal class changes', async () => {
    const cold = await createMapGenerator().generate(config(1, 'cold', geology(5, 'fjord')), {});
    const warm = await createMapGenerator().generate(config(1, 'warm', geology(5, 'fjord')), {});
    const coldRegions = cold.context.state.geologyPlan?.regions ?? [];
    const warmRegions = warm.context.state.geologyPlan?.regions ?? [];

    expect(coldRegions).toHaveLength(5);
    coldRegions.forEach((region, index) => {
      const other = warmRegions[index];
      expect(other).toBeDefined();
      expect(Math.abs(region.centre.x - (other?.centre.x ?? 0))).toBeLessThan(0.02);
      expect(Math.abs(region.centre.y - (other?.centre.y ?? 0))).toBeLessThan(0.02);
    });
    expect(cold.context.state.heightmap).not.toEqual(warm.context.state.heightmap);
  });
});
