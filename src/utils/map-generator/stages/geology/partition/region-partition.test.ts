import { createRegionPartition, regionBorderDistances } from './region-partition';
import type { WorldDimensions } from '../../../../world-dimensions';
import { containsNormalized, type WorldShape } from '../../../../world-shape';
import { GenerationCancelledError } from '../../../errors';
import { RandomFactory } from '../../../random';
import { createWorldSpace } from '../../../space';
import type { GeologicalRegionConfig } from '../../../types';
import { geologyPresetConfig } from '../config/presets';
import { placePartitionMarkers, type RegionMarker } from '../placement/partition-markers';

const WORLD: WorldDimensions = {
  widthMeters: 2000,
  heightMeters: 2000,
  sampleWidth: 65,
  sampleHeight: 65,
};
const LAYOUT = { evenness: 0.6, irregularity: 0.45 };

function world(size: number): WorldDimensions {
  return { widthMeters: 2000, heightMeters: 2000, sampleWidth: size, sampleHeight: size };
}

function regionConfigs(count: number): readonly GeologicalRegionConfig[] {
  const preset = geologyPresetConfig('varied');
  return Array.from(
    { length: count },
    (_, index) => preset.regions[index % preset.regions.length] ?? { type: 'ordinary', size: 1 }
  );
}

function placedMarkers(
  count: number,
  seed = 17,
  dimensions: WorldDimensions = WORLD,
  shape: WorldShape = 'disc'
): RegionMarker[] {
  return placePartitionMarkers({
    regions: regionConfigs(count),
    evenness: LAYOUT.evenness,
    dimensions,
    shape,
    space: createWorldSpace(dimensions),
    random: new RandomFactory(seed),
  });
}

function partition(
  markers: readonly RegionMarker[],
  options: {
    dimensions?: WorldDimensions;
    shape?: WorldShape;
    irregularity?: number;
    seed?: number;
    signal?: AbortSignal;
    report?: (progress: number) => void;
  } = {}
): ReturnType<typeof createRegionPartition> {
  const dimensions = options.dimensions ?? WORLD;
  return createRegionPartition({
    regions: markers,
    layout: {
      evenness: LAYOUT.evenness,
      irregularity: options.irregularity ?? LAYOUT.irregularity,
    },
    dimensions,
    shape: options.shape ?? 'disc',
    random: new RandomFactory(options.seed ?? 17),
    space: createWorldSpace(dimensions),
    signal: options.signal,
    report: options.report,
  });
}

function marker(index: number, x: number, y: number, weight = 1): RegionMarker {
  return {
    id: `region-${index + 1}`,
    type: 'ordinary',
    centre: { x, y },
    weight,
  };
}

/** Cells that touch a cell of another region, counted along both axes. */
function borderLength(owner: Int16Array, width: number, height: number): number {
  let length = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const region = owner[index] ?? -1;
      if (region < 0) {
        continue;
      }
      if (
        x + 1 < width &&
        owner[index + 1] !== undefined &&
        owner[index + 1] >= 0 &&
        owner[index + 1] !== region
      ) {
        length++;
      }
      if (
        y + 1 < height &&
        owner[index + width] !== undefined &&
        owner[index + width] >= 0 &&
        owner[index + width] !== region
      ) {
        length++;
      }
    }
  }
  return length;
}

function maskOf(dimensions: WorldDimensions, shape: WorldShape): Uint8Array {
  const space = createWorldSpace(dimensions);
  const mask = new Uint8Array(dimensions.sampleWidth * dimensions.sampleHeight);
  for (let y = 0; y < dimensions.sampleHeight; y++) {
    for (let x = 0; x < dimensions.sampleWidth; x++) {
      if (containsNormalized(shape, space.cellToNormalized(x, y))) {
        mask[y * dimensions.sampleWidth + x] = 1;
      }
    }
  }
  return mask;
}

describe('regionBorderDistances', () => {
  const grid: WorldDimensions = {
    widthMeters: 50,
    heightMeters: 10,
    sampleWidth: 5,
    sampleHeight: 1,
  };

  it('measures the physical distance to the neighbouring region', () => {
    const distances = regionBorderDistances(new Int16Array([0, 0, 0, 1, 1]), grid);

    expect([...distances]).toEqual([20, 10, 0, 0, 10]);
  });

  it('ignores cells outside the world mask', () => {
    const distances = regionBorderDistances(new Int16Array([0, -1, 0]), {
      ...grid,
      sampleWidth: 3,
    });
    const diagonal = Math.hypot(grid.widthMeters, grid.heightMeters);

    expect(distances[0]).toBeCloseTo(diagonal, 2);
    expect(distances[1]).toBe(0);
    expect(distances[2]).toBeCloseTo(diagonal, 2);
  });

  it('keeps a single region without borders far from every edge', () => {
    const distances = regionBorderDistances(new Int16Array([0, 0, 0]), {
      ...grid,
      sampleWidth: 3,
    });
    const diagonal = Math.hypot(grid.widthMeters, grid.heightMeters);

    expect([...distances].every(value => Math.abs(value - diagonal) < 0.01)).toBe(true);
  });
});

describe('createRegionPartition', () => {
  it('covers every inside-world cell with exactly one region', () => {
    for (const count of [1, 3, 5, 10]) {
      const dimensions = world(41);
      const markers = placedMarkers(count, 17, dimensions);
      const result = partition(markers, { dimensions });
      const mask = maskOf(dimensions, 'disc');

      for (let index = 0; index < mask.length; index++) {
        if (mask[index] === 1) {
          expect(result.owner[index], `count ${count} cell ${index}`).toBeGreaterThanOrEqual(0);
        } else {
          expect(result.owner[index], `count ${count} cell ${index}`).toBe(-1);
        }
      }
      for (let region = 0; region < count; region++) {
        expect(
          [...result.owner].filter(owner => owner === region).length,
          `count ${count} region ${region}`
        ).toBeGreaterThan(0);
      }
    }
  });

  it('is deterministic for one seed and configuration', () => {
    const markers = placedMarkers(5);

    expect(partition(markers)).toEqual(partition(markers));
  });

  it('changes the partition when the seed changes', () => {
    const markers = placedMarkers(5);

    expect(partition(markers, { seed: 18 }).owner).not.toEqual(
      partition(markers, { seed: 17 }).owner
    );
  });

  it('gives a heavier region a larger share', () => {
    const markers = [marker(0, 0.35, 0.5, 2), marker(1, 0.7, 0.5, 1)];
    const result = partition(markers);
    const heavy = [...result.owner].filter(owner => owner === 0).length;
    const light = [...result.owner].filter(owner => owner === 1).length;

    expect(heavy).toBeGreaterThan(light);
  });

  it('reshapes the borders when the irregularity changes', () => {
    const markers = placedMarkers(3);

    expect(partition(markers, { irregularity: 0.9 }).owner).not.toEqual(
      partition(markers, { irregularity: 0 }).owner
    );
  });

  it('lengthens the borders when the irregularity grows', () => {
    const dimensions = world(129);
    const markers = placedMarkers(5, 17, dimensions);
    const smooth = partition(markers, { dimensions, irregularity: 0 });
    const ragged = partition(markers, { dimensions, irregularity: 1 });

    expect(borderLength(ragged.owner, 129, 129)).toBeGreaterThan(
      borderLength(smooth.owner, 129, 129) * 1.1
    );
  });

  it('covers a rectangle world completely', () => {
    const dimensions = world(41);
    const result = partition([marker(0, 0.25, 0.5), marker(1, 0.75, 0.5)], {
      dimensions,
      shape: 'rectangle',
    });

    expect([...result.owner].every(owner => owner >= 0)).toBe(true);
  });

  it('holds the contract across many seeds and region counts', () => {
    for (const count of [5, 10]) {
      for (let seed = 0; seed < 30; seed++) {
        const dimensions = world(41);
        const markers = placedMarkers(count, seed, dimensions);
        expect(
          () => partition(markers, { dimensions }),
          `count ${count} seed ${seed}`
        ).not.toThrow();
      }
    }
  });

  it('stops on an aborted signal', () => {
    const controller = new AbortController();
    controller.abort();

    expect(() => partition(placedMarkers(3), { signal: controller.signal })).toThrow(
      GenerationCancelledError
    );
  });

  it('stops when the signal aborts during the bias fit', () => {
    const controller = new AbortController();

    expect(() =>
      partition(placedMarkers(5), {
        signal: controller.signal,
        report: progress => {
          if (progress > 0.05) {
            controller.abort();
          }
        },
      })
    ).toThrow(GenerationCancelledError);
  });

  it('rejects a world too small for the regions', () => {
    const dimensions = { widthMeters: 2, heightMeters: 2, sampleWidth: 2, sampleHeight: 2 };
    const markers = [marker(0, 0.25, 0.25), marker(1, 0.75, 0.75)];

    expect(() => partition(markers, { dimensions })).toThrow(/infeasible|no cells/);
  });
});
