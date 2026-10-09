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
  widthMeters: 1000,
  heightMeters: 1000,
  sampleWidth: 9,
  sampleHeight: 9,
};

function marker(index: number, x: number, y: number): RegionMarker {
  return { id: `region-${index + 1}`, type: 'ordinary', centre: { x, y }, weight: 1 };
}

function input(regions: readonly RegionMarker[], seed = 3): RegionPartitionInput {
  return {
    regions,
    layout: { evenness: 0.5, irregularity: 0 },
    dimensions: DIMENSIONS,
    shape: 'disc',
    random: new RandomFactory(seed),
    space: createWorldSpace(DIMENSIONS),
  };
}

function maskOf(source: RegionPartitionInput): Uint8Array {
  const mask = new Uint8Array(81);
  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      if (containsNormalized('disc', source.space.cellToNormalized(x, y))) {
        mask[y * 9 + x] = 1;
      }
    }
  }
  return mask;
}

function grow(regions: readonly RegionMarker[], stride = 1, signal?: AbortSignal) {
  const source = input(regions);
  const mask = maskOf(source);
  const samples = sampleWarp(source, undefined, stride);
  const result = growRegions(source, mask, samples, new Float64Array(regions.length), stride, {
    signal,
  });
  return { mask, result };
}

function connected(owner: Int16Array, region: number): boolean {
  const start = owner.indexOf(region);
  if (start < 0) {
    return false;
  }
  const seen = new Set<number>([start]);
  const pending = [start];
  while (pending.length > 0) {
    const cell = pending.pop();
    if (cell === undefined) {
      continue;
    }
    const x = cell % 9;
    const y = (cell - x) / 9;
    for (const neighbour of [
      x > 0 ? cell - 1 : -1,
      x + 1 < 9 ? cell + 1 : -1,
      y > 0 ? cell - 9 : -1,
      y + 1 < 9 ? cell + 9 : -1,
    ]) {
      if (neighbour >= 0 && owner[neighbour] === region && !seen.has(neighbour)) {
        seen.add(neighbour);
        pending.push(neighbour);
      }
    }
  }
  return seen.size === [...owner].filter(value => value === region).length;
}

describe('growRegions', () => {
  it('claims every mask cell and leaves the outside untouched', () => {
    const { mask, result } = grow([marker(0, 0.25, 0.5), marker(1, 0.75, 0.5)]);

    for (let index = 0; index < mask.length; index++) {
      expect(result.owner[index], `cell ${index}`).toBe(
        mask[index] === 1 ? (result.owner[index] ?? -1) : -1
      );
    }
    expect([...result.counts].reduce((sum, count) => sum + count, 0)).toBe(
      mask.reduce((sum, cell) => sum + cell, 0)
    );
  });

  it('keeps every region one 4-connected body', () => {
    const { result } = grow([marker(0, 0.25, 0.5), marker(1, 0.75, 0.5)]);

    expect(connected(result.owner, 0)).toBe(true);
    expect(connected(result.owner, 1)).toBe(true);
  });

  it('is deterministic for one seed', () => {
    expect(grow([marker(0, 0.25, 0.5), marker(1, 0.75, 0.5)]).result.owner).toEqual(
      grow([marker(0, 0.25, 0.5), marker(1, 0.75, 0.5)]).result.owner
    );
  });

  it('claims only lattice cells at a larger stride', () => {
    const { result } = grow([marker(0, 0.25, 0.5), marker(1, 0.75, 0.5)], 2);

    for (let index = 0; index < result.owner.length; index++) {
      if ((result.owner[index] ?? -1) >= 0) {
        const x = index % 9;
        const y = (index - x) / 9;
        expect(x % 2).toBe(0);
        expect(y % 2).toBe(0);
      }
    }
  });

  it('stops when the signal aborts', () => {
    const controller = new AbortController();
    controller.abort();

    expect(() => grow([marker(0, 0.25, 0.5), marker(1, 0.75, 0.5)], 1, controller.signal)).toThrow(
      GenerationCancelledError
    );
  });
});
