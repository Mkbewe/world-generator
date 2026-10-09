import { GenerationCancelledError } from '../../../errors';

export interface PartitionCheckInput {
  readonly owner: Int16Array;
  readonly mask: Uint8Array;
  readonly width: number;
  readonly height: number;
  readonly regionCount: number;
  readonly signal?: AbortSignal;
  readonly report?: (progress: number) => void;
}

/**
 * Verifies the partition contract before the plan is built: every inside-world
 * cell has exactly one owner, every region has cells and is one 4-connected
 * body. Returns the owned cell count per region; a broken partition is
 * rejected with a readable reason.
 */
export function checkPartition(input: PartitionCheckInput): Uint32Array {
  const { owner, mask, width, height, regionCount } = input;
  const counts = new Uint32Array(regionCount);
  const firstCell = new Int32Array(regionCount).fill(-1);

  for (let index = 0; index < owner.length; index++) {
    const region = owner[index] ?? -1;
    if (mask[index] === 1) {
      if (region < 0 || region >= regionCount) {
        throw new Error('Geology partition left a world cell without a region.');
      }
      if ((counts[region] ?? 0) === 0) {
        firstCell[region] = index;
      }
      counts[region] = (counts[region] ?? 0) + 1;
    } else if (region !== -1) {
      throw new Error('Geology partition owned a cell outside the world mask.');
    }
  }

  const visited = new Int32Array(owner.length);
  for (let region = 0; region < regionCount; region++) {
    const count = counts[region] ?? 0;
    if (count === 0) {
      throw new Error(`Geology partition region region-${region + 1} got no cells.`);
    }
    if (
      !connected(
        owner,
        width,
        height,
        region,
        count,
        firstCell[region] ?? -1,
        visited,
        input.signal
      )
    ) {
      throw new Error(`Geology partition region region-${region + 1} is not one connected body.`);
    }
    input.report?.((region + 1) / regionCount);
  }
  return counts;
}

function connected(
  owner: Int16Array,
  width: number,
  height: number,
  region: number,
  count: number,
  start: number,
  visited: Int32Array,
  signal?: AbortSignal
): boolean {
  if (start < 0) {
    return false;
  }
  const token = region + 1;
  const pending = [start];
  visited[start] = token;
  let reached = 1;

  const visit = (neighbour: number): void => {
    if (owner[neighbour] === region && visited[neighbour] !== token) {
      visited[neighbour] = token;
      pending.push(neighbour);
      reached++;
    }
  };

  while (pending.length > 0) {
    const cell = pending.pop();
    if (cell === undefined) {
      continue;
    }
    if (signal?.aborted) {
      throw new GenerationCancelledError();
    }
    const x = cell % width;
    const y = (cell - x) / width;
    if (x > 0) {
      visit(cell - 1);
    }
    if (x + 1 < width) {
      visit(cell + 1);
    }
    if (y > 0) {
      visit(cell - width);
    }
    if (y + 1 < height) {
      visit(cell + width);
    }
  }
  return reached === count;
}
