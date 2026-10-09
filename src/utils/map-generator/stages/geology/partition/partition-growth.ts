import { FrontierHeap } from './frontier-heap';
import type { RegionPartitionInput } from './partition-types';
import type { WarpSamples } from './partition-warp';
import { GenerationCancelledError } from '../../../errors';
import type { WorldPoint } from '../../../types';

/** Claims between two progress reports of the final pass. */
const REPORT_EVERY = 4096;

export interface GrowOptions {
  readonly signal?: AbortSignal;
  readonly report?: (progress: number) => void;
  readonly worldCells?: number;
}

/**
 * Grows every region from its marker cell: the frontier entry with the lowest
 * score wins the next cell, so ownership always arrives through a 4-neighbour.
 * A region whose marker cannot find a free mask cell simply owns nothing and
 * the partition check rejects it.
 */
export function growRegions(
  input: RegionPartitionInput,
  mask: Uint8Array,
  samples: WarpSamples,
  biases: Float64Array,
  stride: number,
  options: GrowOptions = {}
): { owner: Int16Array; counts: Uint32Array } {
  const { dimensions, regions } = input;
  const width = dimensions.sampleWidth;
  const height = dimensions.sampleHeight;
  const owner = new Int16Array(width * height).fill(-1);
  const counts = new Uint32Array(regions.length);
  const best = new Float32Array(width * height).fill(Infinity);
  const heap = new FrontierHeap();
  let claimed = 0;

  const push = (cell: number, region: number): void => {
    if (mask[cell] !== 1 || owner[cell] >= 0) {
      return;
    }
    const x = cell % width;
    const y = (cell - x) / width;
    const score = scoreAt(region, x, y, samples, input, biases);
    if (score < (best[cell] ?? Infinity)) {
      best[cell] = score;
      heap.push(score, cell, region);
    }
  };

  const pushNeighbours = (cell: number, region: number): void => {
    const x = cell % width;
    const y = (cell - x) / width;
    if (x >= stride) {
      push(cell - stride, region);
    }
    if (x + stride < width) {
      push(cell + stride, region);
    }
    if (y >= stride) {
      push(cell - stride * width, region);
    }
    if (y + stride < height) {
      push(cell + stride * width, region);
    }
  };

  for (let region = 0; region < regions.length; region++) {
    const marker = regions[region];
    if (!marker) {
      continue;
    }
    const seed = findSeedCell(marker.centre, mask, owner, stride, input);
    if (seed < 0) {
      continue;
    }
    owner[seed] = region;
    counts[region] = (counts[region] ?? 0) + 1;
    claimed++;
    pushNeighbours(seed, region);
  }

  const entry = { score: 0, cell: 0, region: 0 };
  while (heap.popInto(entry)) {
    if (options.signal?.aborted) {
      throw new GenerationCancelledError();
    }
    if (owner[entry.cell] >= 0) {
      continue;
    }
    owner[entry.cell] = entry.region;
    counts[entry.region] = (counts[entry.region] ?? 0) + 1;
    claimed++;
    if (options.worldCells && claimed % REPORT_EVERY === 0) {
      options.report?.(claimed / options.worldCells);
    }
    pushNeighbours(entry.cell, entry.region);
  }
  return { owner, counts };
}

/** Nearest unowned mask cell to the marker, searched outwards on the lattice. */
function findSeedCell(
  centre: WorldPoint,
  mask: Uint8Array,
  owner: Int16Array,
  stride: number,
  input: RegionPartitionInput
): number {
  const { dimensions, space } = input;
  const width = dimensions.sampleWidth;
  const height = dimensions.sampleHeight;
  const cell = space.normalizedToCell(centre.x, centre.y);
  const startX = Math.floor(cell.x / stride) * stride;
  const startY = Math.floor(cell.y / stride) * stride;
  const maxRadius = Math.ceil(Math.max(width, height) / stride);
  for (let radius = 0; radius <= maxRadius; radius++) {
    for (let y = startY - radius * stride; y <= startY + radius * stride; y += stride) {
      for (let x = startX - radius * stride; x <= startX + radius * stride; x += stride) {
        if (
          radius > 0 &&
          Math.abs(x - startX) !== radius * stride &&
          Math.abs(y - startY) !== radius * stride
        ) {
          continue;
        }
        if (x < 0 || y < 0 || x >= width || y >= height) {
          continue;
        }
        const index = y * width + x;
        if (mask[index] === 1 && owner[index] < 0) {
          return index;
        }
      }
    }
  }
  return -1;
}

/** Score of one region at one cell: squared distance in metres minus its bias. */
function scoreAt(
  region: number,
  x: number,
  y: number,
  samples: WarpSamples,
  input: RegionPartitionInput,
  biases: Float64Array
): number {
  const marker = input.regions[region];
  if (!marker) {
    return Infinity;
  }
  const index = (y / samples.stride) * samples.width + x / samples.stride;
  const dx = ((samples.x[index] ?? 0) - marker.centre.x) * input.dimensions.widthMeters;
  const dy = ((samples.y[index] ?? 0) - marker.centre.y) * input.dimensions.heightMeters;
  return dx * dx + dy * dy - (biases[region] ?? 0);
}
