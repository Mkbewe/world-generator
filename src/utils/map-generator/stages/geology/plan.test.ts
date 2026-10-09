import { geologyPresetConfig } from './config/presets';
import { MAX_REGION_SIZE, MIN_REGION_SIZE } from './defaults';
import { buildGeologyPlan } from './plan';
import type { WorldDimensions } from '../../../world-dimensions';
import { type WorldShape } from '../../../world-shape';
import { RandomFactory } from '../../random';
import { createWorldSpace } from '../../space';
import type { GeologicalRegionConfig, GeologyConfig } from '../../types';

const DIMENSIONS = { widthMeters: 2000, heightMeters: 2000, sampleWidth: 65, sampleHeight: 65 };

function config(regionCount = 5): GeologyConfig {
  const preset = geologyPresetConfig('varied');
  return {
    ...preset,
    regionCount,
    regions: Array.from(
      { length: regionCount },
      (_, index) =>
        preset.regions[index % preset.regions.length] ??
        preset.regions[0] ?? {
          type: 'ordinary' as const,
          size: 1,
        }
    ),
  };
}

function build(seed = 17, regionCount = 5) {
  return buildGeologyPlan(
    config(regionCount),
    new RandomFactory(seed),
    'disc',
    DIMENSIONS,
    createWorldSpace(DIMENSIONS)
  );
}

function ownedCells(owner: Int16Array, index: number): number {
  let count = 0;
  for (const value of owner) {
    if (value === index) {
      count++;
    }
  }
  return count;
}

/** Every region's measured share must sit within 1.5% of its configured target. */
function expectSharesMatch(
  regions: readonly GeologicalRegionConfig[],
  shape: WorldShape,
  irregularity: number,
  dimensions: WorldDimensions,
  seeds: readonly number[]
): void {
  const totalWeight = regions.reduce((sum, region) => sum + region.size, 0);
  for (const seed of seeds) {
    const source: GeologyConfig = {
      regionCount: regions.length,
      layout: { evenness: 0.6, irregularity },
      regions,
    };
    const plan = buildGeologyPlan(
      source,
      new RandomFactory(seed),
      shape,
      dimensions,
      createWorldSpace(dimensions)
    );
    plan.regions.forEach((region, index) => {
      const target = (regions[index]?.size ?? 0) / totalWeight;
      const share = region.areaSquareMeters / plan.worldAreaSquareMeters;
      expect(Math.abs(share - target)).toBeLessThan(0.015);
    });
  }
}

describe('buildGeologyPlan', () => {
  it('is deterministic for one seed and configuration', () => {
    expect(build()).toEqual(build());
  });

  it('covers every inside-world cell with exactly one region', () => {
    const plan = build();

    expect(plan.regions).toHaveLength(5);
    expect(plan.regionOwnerMap).toHaveLength(DIMENSIONS.sampleWidth * DIMENSIONS.sampleHeight);
    expect(plan.regionBorderDistanceMap).toHaveLength(
      DIMENSIONS.sampleWidth * DIMENSIONS.sampleHeight
    );
    for (let index = 0; index < plan.regions.length; index++) {
      expect(ownedCells(plan.regionOwnerMap, index)).toBeGreaterThan(0);
    }
  });

  it('generates a partition for every supported region count', () => {
    for (let count = 1; count <= 10; count++) {
      const plan = build(23, count);

      expect(plan.regions).toHaveLength(count);
      for (let index = 0; index < count; index++) {
        expect(ownedCells(plan.regionOwnerMap, index)).toBeGreaterThan(0);
      }
    }
  });

  it('changes region placement when the seed changes', () => {
    expect(build(18).regions).not.toEqual(build(17).regions);
  });

  it('keeps count, types and settings when only the seed changes', () => {
    const first = build(17);
    const second = build(18);
    const settings = (regions: typeof first.regions) =>
      regions.map(region => ({
        id: region.id,
        type: region.type,
        weight: region.weight,
      }));

    expect(settings(second.regions)).toEqual(settings(first.regions));
    expect(second.regions.map(region => region.centre)).not.toEqual(
      first.regions.map(region => region.centre)
    );
  });

  it('gives a single region the whole world with no internal border', () => {
    const plan = build(17, 1);

    expect(plan.regions).toHaveLength(1);
    expect([...plan.regionOwnerMap].every(owner => owner === 0 || owner === -1)).toBe(true);
    expect(ownedCells(plan.regionOwnerMap, 0)).toBeGreaterThan(0);
    const distances = [...plan.regionBorderDistanceMap];
    const owners = [...plan.regionOwnerMap];
    const diagonal = Math.hypot(DIMENSIONS.widthMeters, DIMENSIONS.heightMeters);
    distances.forEach((distance, index) => {
      if (owners[index] === 0) {
        expect(distance).toBeCloseTo(diagonal, 2);
      } else {
        expect(distance).toBe(0);
      }
    });
  });

  it('keeps the other regions when one region changes', () => {
    const base = config(4);
    const edited: GeologyConfig = {
      ...base,
      regions: base.regions.map((region, index) =>
        index === 1 ? { ...region, type: 'atoll' as const, size: 1.9 } : region
      ),
    };
    const first = buildGeologyPlan(
      base,
      new RandomFactory(17),
      'disc',
      DIMENSIONS,
      createWorldSpace(DIMENSIONS)
    );
    const second = buildGeologyPlan(
      edited,
      new RandomFactory(17),
      'disc',
      DIMENSIONS,
      createWorldSpace(DIMENSIONS)
    );

    const geometry = (region: (typeof first.regions)[number]) => ({
      id: region.id,
      type: region.type,
      centre: region.centre,
      weight: region.weight,
    });

    expect(geometry(second.regions[0] ?? base.regions[0])).toEqual(
      geometry(first.regions[0] ?? base.regions[0])
    );
    expect(geometry(second.regions[2] ?? base.regions[2])).toEqual(
      geometry(first.regions[2] ?? base.regions[2])
    );
    expect(geometry(second.regions[3] ?? base.regions[3])).toEqual(
      geometry(first.regions[3] ?? base.regions[3])
    );
    expect(second.regions[1]).toMatchObject({ type: 'atoll', weight: 1.9 });
    expect(second.regions[1]?.centre).toEqual(first.regions[1]?.centre);
  });

  it('changes only the borders when the irregularity changes', () => {
    const base = config(3);
    const calm = buildGeologyPlan(
      { ...base, layout: { evenness: 0.5, irregularity: 0 } },
      new RandomFactory(17),
      'disc',
      DIMENSIONS,
      createWorldSpace(DIMENSIONS)
    );
    const ragged = buildGeologyPlan(
      { ...base, layout: { evenness: 0.5, irregularity: 0.9 } },
      new RandomFactory(17),
      'disc',
      DIMENSIONS,
      createWorldSpace(DIMENSIONS)
    );

    const geometry = (regions: typeof calm.regions) =>
      regions.map(({ id, type, centre, weight }) => ({
        id,
        type,
        centre,
        weight,
      }));

    expect(geometry(ragged.regions)).toEqual(geometry(calm.regions));
    expect(ragged.regionOwnerMap).not.toEqual(calm.regionOwnerMap);
  });

  it('gives each region one connected body', () => {
    const plan = build(17, 5);
    const { width, height } = plan.regionRasterSize;
    const owners = plan.regionOwnerMap;
    for (let region = 0; region < plan.regions.length; region++) {
      const start = owners.indexOf(region);
      const reached = new Set<number>([start]);
      const pending = [start];
      while (pending.length > 0) {
        const cell = pending.pop();
        if (cell === undefined) {
          continue;
        }
        const x = cell % width;
        const y = Math.floor(cell / width);
        const neighbours = [
          x > 0 ? cell - 1 : -1,
          x + 1 < width ? cell + 1 : -1,
          y > 0 ? cell - width : -1,
          y + 1 < height ? cell + width : -1,
        ];
        for (const neighbour of neighbours) {
          if (neighbour >= 0 && owners[neighbour] === region && !reached.has(neighbour)) {
            reached.add(neighbour);
            pending.push(neighbour);
          }
        }
      }
      expect(reached.size).toBe(ownedCells(owners, region));
    }
  });

  it('keeps the measured shares within tolerance of the configured sizes', () => {
    expectSharesMatch(config(5).regions, 'disc', 0.45, DIMENSIONS, [17, 410, 23]);
  });

  it('matches the configured shares for the extreme sizes', () => {
    expectSharesMatch(
      Array.from({ length: 4 }, () => ({ type: 'ordinary' as const, size: MIN_REGION_SIZE })),
      'disc',
      0.45,
      DIMENSIONS,
      [17]
    );
    expectSharesMatch(
      Array.from({ length: 3 }, () => ({ type: 'atoll' as const, size: MAX_REGION_SIZE })),
      'disc',
      0.45,
      DIMENSIONS,
      [17]
    );
  });

  it('matches the configured shares for one, two and ten regions', () => {
    expectSharesMatch([{ type: 'ordinary', size: 1 }], 'disc', 0.45, DIMENSIONS, [17]);
    expectSharesMatch(config(2).regions, 'disc', 0.45, DIMENSIONS, [17, 410]);
    expectSharesMatch(config(10).regions, 'disc', 0.45, DIMENSIONS, [17, 410]);
  });

  it('matches the configured shares on a rectangle world', () => {
    expectSharesMatch(config(4).regions, 'rectangle', 0.45, DIMENSIONS, [17, 410]);
  });

  it('matches the configured shares at full border irregularity', () => {
    expectSharesMatch(config(5).regions, 'disc', 1, DIMENSIONS, [17, 410]);
  });

  it('matches the configured shares on a larger raster', () => {
    const larger: WorldDimensions = {
      widthMeters: 2000,
      heightMeters: 2000,
      sampleWidth: 129,
      sampleHeight: 129,
    };

    expectSharesMatch(config(5).regions, 'disc', 0.45, larger, [17]);
  });

  it('measures every region and the world it covers', () => {
    const plan = build();
    const insideCells = [...plan.regionOwnerMap].filter(owner => owner >= 0).length;
    const cellArea =
      (DIMENSIONS.widthMeters / DIMENSIONS.sampleWidth) *
      (DIMENSIONS.heightMeters / DIMENSIONS.sampleHeight);

    expect(plan.worldAreaSquareMeters).toBeCloseTo(insideCells * cellArea, 6);
    const total = plan.regions.reduce((sum, region) => sum + region.areaSquareMeters, 0);
    expect(total).toBeCloseTo(plan.worldAreaSquareMeters, 6);
    for (const region of plan.regions) {
      expect(region.areaSquareMeters).toBeGreaterThan(0);
    }
  });

  it('rejects an infeasible layout explicitly', () => {
    const tiny = { widthMeters: 2, heightMeters: 2, sampleWidth: 2, sampleHeight: 2 };
    const preset = geologyPresetConfig('mosaic');
    const cramped: GeologyConfig = { ...preset, layout: { evenness: 1, irregularity: 0 } };

    expect(() =>
      buildGeologyPlan(cramped, new RandomFactory(5), 'disc', tiny, createWorldSpace(tiny))
    ).toThrow(/infeasible|no cells/);
  });
});
