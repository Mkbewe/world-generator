import {
  CLIMATE_LAKE_EPSILON,
  CLIMATE_RIVER_STRENGTH_SCALE,
  CLIMATE_RIVER_THRESHOLD_SHARE,
} from './defaults';
import type { WorldDimensions } from '../../../world-dimensions';
import { GenerationCancelledError } from '../../errors';

export interface HydrologyInput {
  readonly worldMask: Uint8Array;
  readonly heightmap: Float32Array;
  readonly moistureMap: Float32Array;
  readonly dimensions: WorldDimensions;
  readonly signal?: AbortSignal;
  readonly report?: (progress: number) => void;
}

export interface HydrologyResult {
  /** River strength, 0 for no river; 1..255 for an active channel. */
  readonly riverMap: Uint8Array;
  /** Filled depressions; 1 marks a lake cell. */
  readonly lakeMap: Uint8Array;
  /** Lake/drainage basin id; 0 outside a basin or outside the world. */
  readonly basinMap: Int16Array;
  readonly basinCount: number;
}

const MAX_BASIN_ID = 32_767;
const NEIGHBOUR_OFFSETS = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
] as const;

/**
 * Builds surface hydrology from the heightmap and final moisture: priority
 * flood fills depressions into lakes, D8 flow accumulates runoff downhill into
 * rivers, lakes route their runoff to the lowest outlet, and lake/drainage
 * basins get stable ids.
 */
export function buildHydrology(input: HydrologyInput): HydrologyResult {
  const { worldMask, heightmap, moistureMap, dimensions, signal, report } = input;
  const { sampleWidth, sampleHeight } = dimensions;
  const cells = sampleWidth * sampleHeight;
  const lakeMap = new Uint8Array(cells);
  const visited = new Uint8Array(cells);
  const heap = new MinLevelHeap(cells);

  let seeded = 0;
  for (let index = 0; index < cells; index++) {
    if (worldMask[index] !== 0 && heightmap[index] <= 0) {
      visited[index] = 1;
      heap.push(index, heightmap[index]);
      seeded++;
    }
  }
  if (seeded === 0) {
    seeded = seedWorldBorder(worldMask, heightmap, visited, heap, sampleWidth, sampleHeight);
  }
  if (seeded === 0) {
    const empty = new Int16Array(cells);
    return {
      riverMap: new Uint8Array(cells),
      lakeMap,
      basinMap: empty,
      basinCount: 0,
    };
  }

  let processed = 0;
  while (heap.pop()) {
    if (signal?.aborted) {
      throw new GenerationCancelledError();
    }
    const index = heap.lastIndex;
    const level = heap.lastLevel;
    if (processed % 8192 === 0) {
      report?.(Math.min(0.6, (processed / cells) * 0.6));
    }
    processed++;

    const x = index % sampleWidth;
    const y = (index - x) / sampleWidth;
    for (const [offsetX, offsetY] of NEIGHBOUR_OFFSETS) {
      const neighbourX = x + offsetX;
      const neighbourY = y + offsetY;
      if (
        neighbourX < 0 ||
        neighbourY < 0 ||
        neighbourX >= sampleWidth ||
        neighbourY >= sampleHeight
      ) {
        continue;
      }
      const neighbour = neighbourY * sampleWidth + neighbourX;
      if (worldMask[neighbour] === 0 || visited[neighbour] !== 0) {
        continue;
      }
      visited[neighbour] = 1;
      const height = heightmap[neighbour];
      const filled = Math.max(height, level);
      if (filled > height + CLIMATE_LAKE_EPSILON) {
        lakeMap[neighbour] = 1;
      }
      heap.push(neighbour, filled);
    }
  }

  const downstream = new Int32Array(cells);
  downstream.fill(-1);
  const order = new Uint32Array(cells);
  let landCells = 0;
  for (let index = 0; index < cells; index++) {
    if (worldMask[index] === 0 || heightmap[index] <= 0 || lakeMap[index] !== 0) {
      continue;
    }
    if ((index & 0xffff) === 0) {
      if (signal?.aborted) {
        throw new GenerationCancelledError();
      }
      report?.(0.6 + (index / cells) * 0.2);
    }
    downstream[index] = lowestNeighbour(index, sampleWidth, sampleHeight, worldMask, heightmap);
    order[landCells++] = index;
  }
  order.subarray(0, landCells).sort((left, right) => heightmap[right] - heightmap[left]);

  const flow = new Float32Array(cells);
  for (let entry = 0; entry < landCells; entry++) {
    const index = order[entry];
    if ((entry & 0xffff) === 0 && signal?.aborted) {
      throw new GenerationCancelledError();
    }
    flow[index] = moistureMap[index];
  }
  for (let entry = 0; entry < landCells; entry++) {
    const index = order[entry];
    if ((entry & 0xffff) === 0) {
      if (signal?.aborted) {
        throw new GenerationCancelledError();
      }
      report?.(0.8 + (entry / Math.max(1, landCells)) * 0.2);
    }
    const next = downstream[index];
    if (next >= 0) {
      flow[next] += flow[index];
    }
  }

  const basinMap = new Int16Array(cells);
  const basinCount = labelBasins(lakeMap, basinMap, sampleWidth, sampleHeight);
  const outletIndex = new Int32Array(basinCount + 1);
  outletIndex.fill(-1);
  const outletHeight = new Float32Array(basinCount + 1);
  outletHeight.fill(Infinity);
  const lakeRunoff = new Float32Array(basinCount + 1);
  const lakeOutflow = new Float32Array(cells);
  for (let index = 0; index < cells; index++) {
    if (lakeMap[index] === 0) {
      continue;
    }
    const basin = basinMap[index];
    if (basin <= 0) {
      continue;
    }
    lakeRunoff[basin] += moistureMap[index];
    const x = index % sampleWidth;
    const y = (index - x) / sampleWidth;
    for (const [offsetX, offsetY] of NEIGHBOUR_OFFSETS) {
      const neighbourX = x + offsetX;
      const neighbourY = y + offsetY;
      if (
        neighbourX < 0 ||
        neighbourY < 0 ||
        neighbourX >= sampleWidth ||
        neighbourY >= sampleHeight
      ) {
        continue;
      }
      const neighbour = neighbourY * sampleWidth + neighbourX;
      if (worldMask[neighbour] === 0 || lakeMap[neighbour] !== 0) {
        continue;
      }
      const height = heightmap[neighbour];
      if (height < outletHeight[basin]) {
        outletHeight[basin] = height;
        outletIndex[basin] = neighbour;
      }
    }
  }
  for (let basin = 1; basin <= basinCount; basin++) {
    const outlet = outletIndex[basin];
    if (outlet >= 0 && heightmap[outlet] > 0) {
      lakeOutflow[outlet] += lakeRunoff[basin];
    }
  }
  for (let entry = 0; entry < landCells; entry++) {
    const index = order[entry];
    const next = downstream[index];
    if (next >= 0) {
      lakeOutflow[next] += lakeOutflow[index];
    }
  }

  const threshold = Math.max(1, landCells * CLIMATE_RIVER_THRESHOLD_SHARE);
  const riverMap = new Uint8Array(cells);
  for (let entry = 0; entry < landCells; entry++) {
    const index = order[entry];
    const total = flow[index] + lakeOutflow[index];
    if (total < threshold) {
      continue;
    }
    const strength = Math.min(1, (total - threshold) / (threshold * CLIMATE_RIVER_STRENGTH_SCALE));
    riverMap[index] = 1 + Math.round(strength * 254);
  }
  for (let entry = landCells - 1; entry >= 0; entry--) {
    const index = order[entry];
    const next = downstream[index];
    if (next >= 0 && basinMap[index] === 0) {
      basinMap[index] = basinMap[next];
    }
  }

  report?.(1);
  return { riverMap, lakeMap, basinMap, basinCount };
}

function seedWorldBorder(
  worldMask: Uint8Array,
  heightmap: Float32Array,
  visited: Uint8Array,
  heap: MinLevelHeap,
  width: number,
  height: number
): number {
  let seeded = 0;
  for (let index = 0; index < worldMask.length; index++) {
    if (worldMask[index] === 0) {
      continue;
    }
    const x = index % width;
    const y = (index - x) / width;
    if (isWorldBoundary(x, y, worldMask, width, height)) {
      visited[index] = 1;
      heap.push(index, heightmap[index]);
      seeded++;
    }
  }
  return seeded;
}

/** Raster edge or any cell touching the outside of the world mask. */
function isWorldBoundary(
  x: number,
  y: number,
  worldMask: Uint8Array,
  width: number,
  height: number
): boolean {
  if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
    return true;
  }
  for (const [offsetX, offsetY] of NEIGHBOUR_OFFSETS) {
    const neighbourX = x + offsetX;
    const neighbourY = y + offsetY;
    if (neighbourX < 0 || neighbourY < 0 || neighbourX >= width || neighbourY >= height) {
      return true;
    }
    if (worldMask[neighbourY * width + neighbourX] === 0) {
      return true;
    }
  }
  return false;
}

function lowestNeighbour(
  index: number,
  width: number,
  height: number,
  worldMask: Uint8Array,
  heightmap: Float32Array
): number {
  const x = index % width;
  const y = (index - x) / width;
  const currentHeight = heightmap[index];
  let lowest = -1;
  let lowestHeight = currentHeight;
  for (const [offsetX, offsetY] of NEIGHBOUR_OFFSETS) {
    const neighbourX = x + offsetX;
    const neighbourY = y + offsetY;
    if (neighbourX < 0 || neighbourY < 0 || neighbourX >= width || neighbourY >= height) {
      continue;
    }
    const neighbour = neighbourY * width + neighbourX;
    if (worldMask[neighbour] === 0) {
      continue;
    }
    const neighbourHeight = heightmap[neighbour];
    if (neighbourHeight < lowestHeight) {
      lowest = neighbour;
      lowestHeight = neighbourHeight;
    }
  }
  return lowest;
}

function labelBasins(
  lakeMap: Uint8Array,
  basinMap: Int16Array,
  width: number,
  height: number
): number {
  const stack = new Int32Array(lakeMap.length);
  let nextId = 1;
  for (let index = 0; index < lakeMap.length; index++) {
    if (lakeMap[index] === 0 || basinMap[index] !== 0) {
      continue;
    }
    const id = Math.min(MAX_BASIN_ID, nextId);
    let tail = 0;
    stack[tail++] = index;
    basinMap[index] = id;
    while (tail > 0) {
      const current = stack[--tail];
      const x = current % width;
      const y = (current - x) / width;
      for (const [offsetX, offsetY] of NEIGHBOUR_OFFSETS) {
        const neighbourX = x + offsetX;
        const neighbourY = y + offsetY;
        if (neighbourX < 0 || neighbourY < 0 || neighbourX >= width || neighbourY >= height) {
          continue;
        }
        const neighbour = neighbourY * width + neighbourX;
        if (lakeMap[neighbour] === 0 || basinMap[neighbour] !== 0) {
          continue;
        }
        basinMap[neighbour] = id;
        stack[tail++] = neighbour;
      }
    }
    nextId++;
  }
  return Math.min(MAX_BASIN_ID, nextId - 1);
}

/** Binary min-heap of cell indices ordered by their filled water level. */
class MinLevelHeap {
  private readonly indices: Int32Array;
  private readonly levels: Float32Array;
  private size = 0;
  lastIndex = -1;
  lastLevel = 0;

  constructor(capacity: number) {
    this.indices = new Int32Array(capacity);
    this.levels = new Float32Array(capacity);
  }

  push(index: number, level: number): void {
    let position = this.size++;
    while (position > 0) {
      const parent = (position - 1) >> 1;
      if (this.levels[parent] <= level) {
        break;
      }
      this.indices[position] = this.indices[parent];
      this.levels[position] = this.levels[parent];
      position = parent;
    }
    this.indices[position] = index;
    this.levels[position] = level;
  }

  pop(): boolean {
    if (this.size === 0) {
      return false;
    }
    this.lastIndex = this.indices[0];
    this.lastLevel = this.levels[0];
    this.size--;
    if (this.size === 0) {
      return true;
    }
    const index = this.indices[this.size];
    const level = this.levels[this.size];
    let position = 0;
    while (true) {
      const left = position * 2 + 1;
      if (left >= this.size) {
        break;
      }
      const right = left + 1;
      const child = right < this.size && this.levels[right] < this.levels[left] ? right : left;
      if (this.levels[child] >= level) {
        break;
      }
      this.indices[position] = this.indices[child];
      this.levels[position] = this.levels[child];
      position = child;
    }
    this.indices[position] = index;
    this.levels[position] = level;
    return true;
  }
}
