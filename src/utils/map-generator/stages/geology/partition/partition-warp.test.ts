import type { RegionPartitionInput } from './partition-types';
import { createBorderWarp, sampleWarp } from './partition-warp';
import type { WorldDimensions } from '../../../../world-dimensions';
import { RandomFactory } from '../../../random';
import { createWorldSpace } from '../../../space';

const DIMENSIONS: WorldDimensions = {
  widthMeters: 1000,
  heightMeters: 1000,
  sampleWidth: 4,
  sampleHeight: 4,
};

function input(irregularity: number, seed = 7): RegionPartitionInput {
  return {
    regions: [],
    layout: { evenness: 0.5, irregularity },
    dimensions: DIMENSIONS,
    shape: 'disc',
    random: new RandomFactory(seed),
    space: createWorldSpace(DIMENSIONS),
  };
}

describe('createBorderWarp', () => {
  it('keeps coordinates untouched at zero irregularity', () => {
    expect(createBorderWarp(input(0))).toBeUndefined();
  });

  it('displaces the point and stays deterministic for one seed', () => {
    const first = createBorderWarp(input(1, 7));
    const second = createBorderWarp(input(1, 7));
    const other = createBorderWarp(input(1, 8));
    const point = { x: 0.3, y: 0.6 };

    expect(first).toBeDefined();
    expect(first?.(point)).toEqual(second?.(point));
    expect(first?.(point)).not.toEqual(other?.(point));
  });
});

describe('sampleWarp', () => {
  it('samples the full grid at stride one', () => {
    const source = input(0);
    const samples = sampleWarp(source, undefined, 1);

    expect(samples.stride).toBe(1);
    expect(samples.width).toBe(4);
    expect(samples.x).toHaveLength(16);
    expect(samples.x[0]).toBeCloseTo(0, 5);
    expect(samples.x[15]).toBeCloseTo(1, 5);
    expect(samples.y[4]).toBeCloseTo(1 / 3, 5);
  });

  it('samples the lattice at a larger stride', () => {
    const source = input(0);
    const samples = sampleWarp(source, undefined, 2);

    expect(samples.width).toBe(2);
    expect(samples.x).toHaveLength(4);
    expect(samples.x[3]).toBeCloseTo(2 / 3, 5);
  });

  it('stores the warped coordinates when a warp is given', () => {
    const source = input(0);
    const warp = (point: { x: number; y: number }) => ({ x: point.x + 0.1, y: point.y });
    const samples = sampleWarp(source, warp, 1);

    expect(samples.x[0]).toBeCloseTo(0.1, 5);
    expect(samples.x[15]).toBeCloseTo(1.1, 5);
  });
});
