import type { WorldDimensions } from '../../world-dimensions';
import type { GeologyPlan } from '../types';

/** Datum every field hangs from; land is strictly above it. */
export const SEA_LEVEL_METERS = 0;

export interface LandComponent {
  readonly id: number;
  readonly cells: number;
  readonly areaSquareMeters: number;
  /** Thickness of the widest inscribed band, in metres. */
  readonly widthMeters: number;
  /** Whether the component touches the world mask edge. */
  readonly touchesEdge: boolean;
  /** Geological areas that contributed at least one cell of this component. */
  readonly areaIds: readonly string[];
}

export interface AreaLandSummary {
  /** Separate land components this area contributed to. */
  readonly components: number;
  readonly landCells: number;
}

export interface LandAnalysis {
  readonly components: readonly LandComponent[];
  /** Component label per cell, `-1` for water and cells outside the mask. */
  readonly componentByIndex: Int32Array;
  /** One entry per planned area, including areas without land. */
  readonly byArea: ReadonlyMap<string, AreaLandSummary>;
  readonly landCells: number;
  readonly landShare: number;
  readonly maxHeight: number;
  readonly minHeight: number;
  /** Largest absolute height step between orthogonal neighbours inside the mask. */
  readonly maxStepMeters: number;
}

export interface LandAnalysisInput {
  readonly heightmap: Float32Array;
  readonly provenanceMap?: Int16Array;
  readonly plan: GeologyPlan;
  readonly dimensions: WorldDimensions;
  readonly worldMask: Uint8Array;
  readonly seaLevel?: number;
}

/**
 * One shared component pass over the heightfield: connected land above the sea
 * level, its size and thickness, provenance and the field's continuity. The
 * same result feeds the GEO-07 acceptance and the later `LandOceanStage`, so
 * there is no second implementation of the classification.
 */
export function analyzeLand(input: LandAnalysisInput): LandAnalysis {
  const { heightmap, provenanceMap, plan, dimensions, worldMask } = input;
  const seaLevel = input.seaLevel ?? SEA_LEVEL_METERS;
  const { sampleWidth, sampleHeight } = dimensions;
  if (worldMask.length !== sampleWidth * sampleHeight || heightmap.length !== worldMask.length) {
    throw new Error('Land analysis needs the mask and heightfield at the raster size.');
  }
  const cellSquareMeters =
    (dimensions.widthMeters / sampleWidth) * (dimensions.heightMeters / sampleHeight);
  const cellSizeMeters = Math.min(
    dimensions.widthMeters / sampleWidth,
    dimensions.heightMeters / sampleHeight
  );
  const isLand = new Uint8Array(worldMask.length);
  let landCells = 0;
  let maxHeight = -Infinity;
  let minHeight = Infinity;
  let maxStepMeters = 0;

  for (let index = 0; index < worldMask.length; index++) {
    if (worldMask[index] === 0) {
      continue;
    }
    const value = heightmap[index];
    maxHeight = Math.max(maxHeight, value);
    minHeight = Math.min(minHeight, value);
    if (value > seaLevel) {
      isLand[index] = 1;
      landCells++;
    }
  }
  for (let y = 0; y < sampleHeight; y++) {
    for (let x = 0; x < sampleWidth; x++) {
      const index = y * sampleWidth + x;
      if (worldMask[index] === 0) {
        continue;
      }
      if (x > 0 && worldMask[index - 1] === 1) {
        maxStepMeters = Math.max(maxStepMeters, Math.abs(heightmap[index] - heightmap[index - 1]));
      }
      if (y > 0 && worldMask[index - sampleWidth] === 1) {
        maxStepMeters = Math.max(
          maxStepMeters,
          Math.abs(heightmap[index] - heightmap[index - sampleWidth])
        );
      }
    }
  }

  const thickness = distanceToWater(isLand, sampleWidth, sampleHeight);
  const labels = new Int32Array(worldMask.length).fill(-1);
  const components: LandComponent[] = [];
  const byArea = new Map<string, { components: number; landCells: number }>(
    plan.areas.map(area => [area.id, { components: 0, landCells: 0 }])
  );

  for (let start = 0; start < isLand.length; start++) {
    if (isLand[start] === 0 || labels[start] !== -1) {
      continue;
    }
    const id = components.length;
    const cells: number[] = [];
    const queue: number[] = [start];
    labels[start] = id;
    let touchesEdge = false;
    let widest = 1;

    while (queue.length > 0) {
      const index = queue.pop();
      if (index === undefined) {
        break;
      }
      cells.push(index);
      widest = Math.max(widest, thickness[index]);
      const x = index % sampleWidth;
      const y = (index - x) / sampleWidth;
      if (x === 0 || y === 0 || x === sampleWidth - 1 || y === sampleHeight - 1) {
        touchesEdge = true;
      }
      for (const neighbour of neighbours(index, x, y, sampleWidth)) {
        if (isLand[neighbour] === 1 && labels[neighbour] === -1) {
          labels[neighbour] = id;
          queue.push(neighbour);
        }
      }
    }

    const areaCells = new Map<string, number>();
    for (const index of cells) {
      const areaId = provenanceAreaId(provenanceMap?.[index], plan);
      if (!areaId) {
        continue;
      }
      const summary = byArea.get(areaId);
      if (summary) {
        summary.landCells++;
      }
      areaCells.set(areaId, (areaCells.get(areaId) ?? 0) + 1);
    }
    for (const areaId of areaCells.keys()) {
      const summary = byArea.get(areaId);
      if (summary) {
        summary.components++;
      }
    }
    components.push({
      id,
      cells: cells.length,
      areaSquareMeters: cells.length * cellSquareMeters,
      widthMeters: (2 * widest - 1) * cellSizeMeters,
      touchesEdge,
      areaIds: [...areaCells.keys()].sort(),
    });
  }

  const cellsInsideMask = worldMask.reduce((total, value) => total + (value === 1 ? 1 : 0), 0);
  return {
    components,
    componentByIndex: labels,
    byArea,
    landCells,
    landShare: cellsInsideMask === 0 ? 0 : landCells / cellsInsideMask,
    maxHeight: Number.isFinite(maxHeight) ? maxHeight : 0,
    minHeight: Number.isFinite(minHeight) ? minHeight : 0,
    maxStepMeters,
  };
}

/** 4-neighbour indices of a cell, skipping the ones outside the raster. */
function* neighbours(index: number, x: number, y: number, width: number): Generator<number> {
  if (x > 0) {
    yield index - 1;
  }
  if (x < width - 1) {
    yield index + 1;
  }
  if (y > 0) {
    yield index - width;
  }
  yield index + width;
}

/** Chebyshev-free thickness: cell distance to the nearest non-land cell. */
function distanceToWater(isLand: Uint8Array, width: number, height: number): Float32Array {
  const distance = new Float32Array(isLand.length);
  const queue: number[] = [];
  for (let index = 0; index < isLand.length; index++) {
    if (isLand[index] === 0) {
      continue;
    }
    const x = index % width;
    const y = (index - x) / width;
    const touchesWater =
      x === 0 ||
      y === 0 ||
      x === width - 1 ||
      y === height - 1 ||
      isLand[index - 1] === 0 ||
      isLand[index + 1] === 0 ||
      isLand[index - width] === 0 ||
      isLand[index + width] === 0;
    if (touchesWater) {
      distance[index] = 1;
      queue.push(index);
    }
  }

  let head = 0;
  while (head < queue.length) {
    const index = queue[head++];
    const x = index % width;
    const y = (index - x) / width;
    const next = distance[index] + 1;
    for (const neighbour of neighbours(index, x, y, width)) {
      if (isLand[neighbour] === 1 && distance[neighbour] === 0) {
        distance[neighbour] = next;
        queue.push(neighbour);
      }
    }
  }
  return distance;
}

/** Area id of one provenance index; undefined for outside or stale indices. */
function provenanceAreaId(index: number | undefined, plan: GeologyPlan): string | undefined {
  if (index === undefined || index < 0 || index >= plan.areas.length) {
    return undefined;
  }
  return plan.areas[index]?.id;
}
