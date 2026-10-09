import { fitRegionBiases } from './partition-bias';
import { growRegions } from './partition-growth';
import type { RegionPartitionInput } from './partition-types';
import { sampleWarp } from './partition-warp';
import type { WorldDimensions } from '../../../../world-dimensions';
import { containsNormalized } from '../../../../world-shape';
import { GenerationCancelledError } from '../../../errors';
import { RandomFactory } from '../../../random';
import { createWorldSpace } from '../../../space';
import type { RegionMarker } from '../placement/partition-markers';

const DIMENSIONS: WorldDimensions = {
  widthMeters: 2000,
  heightMeters: 2000,
  sampleWidth: 41,
  sampleHeight: 41,
};

function region(index: number, x: number, y: number, weight: number): RegionMarker {
  return { id: `region-${index + 1}`, type: 'ordinary', centre: { x, y }, weight };
}

function build(regions: readonly RegionMarker[]): {
  input: RegionPartitionInput;
  mask: Uint8Array;
  worldCells: number;
} {
  const input: RegionPartitionInput = {
    regions,
    layout: { evenness: 0.5, irregularity: 0 },
    dimensions: DIMENSIONS,
    shape: 'disc',
    random: new RandomFactory(5),
    space: createWorldSpace(DIMENSIONS),
  };
  const mask = new Uint8Array(41 * 41);
  let worldCells = 0;
  for (let y = 0; y < 41; y++) {
    for (let x = 0; x < 41; x++) {
      if (containsNormalized('disc', input.space.cellToNormalized(x, y))) {
        mask[y * 41 + x] = 1;
        worldCells++;
      }
    }
  }
  return { input, mask, worldCells };
}

function sharesOf(input: RegionPartitionInput, mask: Uint8Array, biases: Float64Array): number[] {
  const grown = growRegions(input, mask, sampleWarp(input, undefined, 1), biases, 1);
  const total = [...grown.counts].reduce((sum, count) => sum + count, 0);
  return [...grown.counts].map(count => count / total);
}

describe('fitRegionBiases', () => {
  it('skips the fit for a single region', () => {
    const { input, mask, worldCells } = build([region(0, 0.5, 0.5, 1)]);
    const report = vi.fn();

    expect([...fitRegionBiases(input, mask, undefined, worldCells, report)]).toEqual([0]);
    expect(report).toHaveBeenCalledWith(1);
  });

  it('skips the fit when the world is too small for the regions', () => {
    const tiny: WorldDimensions = {
      widthMeters: 2,
      heightMeters: 2,
      sampleWidth: 2,
      sampleHeight: 2,
    };
    const input: RegionPartitionInput = {
      regions: [region(0, 0.25, 0.25, 1), region(1, 0.75, 0.75, 1)],
      layout: { evenness: 0.5, irregularity: 0 },
      dimensions: tiny,
      shape: 'rectangle',
      random: new RandomFactory(5),
      space: createWorldSpace(tiny),
    };

    expect([...fitRegionBiases(input, new Uint8Array(4).fill(1), undefined, 4)]).toEqual([0, 0]);
  });

  it('drives the grown shares to the configured targets', () => {
    const { input, mask, worldCells } = build([
      region(0, 0.5, 0.25, 2),
      region(1, 0.25, 0.7, 1),
      region(2, 0.75, 0.7, 1),
    ]);
    const report = vi.fn();

    const biases = fitRegionBiases(input, mask, undefined, worldCells, report);
    const shares = sharesOf(input, mask, biases);

    expect(Math.abs((shares[0] ?? 0) - 0.5)).toBeLessThan(0.03);
    expect(Math.abs((shares[1] ?? 0) - 0.25)).toBeLessThan(0.03);
    expect(Math.abs((shares[2] ?? 0) - 0.25)).toBeLessThan(0.03);
    expect(shares[0]).toBeGreaterThan(shares[1] ?? 1);
    expect(report).toHaveBeenLastCalledWith(1);
  });

  it('stops when the signal aborts', () => {
    const { input, mask, worldCells } = build([
      region(0, 0.5, 0.25, 2),
      region(1, 0.25, 0.7, 1),
      region(2, 0.75, 0.7, 1),
    ]);
    const controller = new AbortController();
    controller.abort();

    expect(() =>
      fitRegionBiases({ ...input, signal: controller.signal }, mask, undefined, worldCells)
    ).toThrow(GenerationCancelledError);
  });
});
