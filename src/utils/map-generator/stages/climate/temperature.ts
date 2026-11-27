import {
  CLIMATE_BASE_BLUR_SIGMA_SHARE,
  CLIMATE_BASE_GRID_SIDE,
  CLIMATE_COAST_MODERATION,
  CLIMATE_COAST_REACH_SHARE,
  CLIMATE_COAST_TARGET,
  CLIMATE_CURRENT_MODERATION_BOOST,
  CLIMATE_LAPSE_PER_1000_METERS,
  CLIMATE_LOWLAND_METERS,
  CLIMATE_SHALLOW_WATER_METERS,
  CLIMATE_TEMPERATURE_NOISE_AMPLITUDE,
  CLIMATE_WARP_AMPLITUDE,
  HEAT_ZONE_TEMPERATURES,
} from './defaults';
import { createTemperatureBands, type TemperatureBands } from './noise';
import { clamp01 } from '../../../math';
import type { WorldDimensions } from '../../../world-dimensions';
import { GenerationCancelledError } from '../../errors';
import type { RandomFactory } from '../../random';
import type { WorldSpace } from '../../space';
import type { HeatZoneConfig } from '../../types';

export interface TemperatureFieldInput {
  readonly worldMask: Uint8Array;
  readonly heatZoneMap: Int16Array;
  readonly heightmap: Float32Array;
  readonly oceanCurrentStrength: Float32Array;
  readonly zones: readonly HeatZoneConfig[];
  readonly dimensions: WorldDimensions;
  readonly space: WorldSpace;
  readonly random: RandomFactory;
  readonly signal?: AbortSignal;
  readonly report?: (progress: number) => void;
}

interface CoarseTemperatureGrid {
  /** Mean zone temperature per grid cell, 0..1. */
  readonly values: Float32Array;
  /** Source-cell count per grid cell; reused as the visited mark while filling. */
  readonly counts: Uint32Array;
  /** Source cells at or below the waterline per grid cell. */
  readonly waterCounts: Uint32Array;
  readonly width: number;
  readonly height: number;
}

/**
 * Builds the continuous temperature field: heat-zone cells vote into a coarse
 * grid, the grid is filled and blurred, then every map cell samples it through
 * a seeded domain warp and applies elevation, coastal and anomaly modifiers.
 */
export function buildTemperatureMap(input: TemperatureFieldInput): Float32Array {
  const { worldMask, heatZoneMap, heightmap, zones, dimensions, space, random, signal, report } =
    input;

  const grid = accumulateHeatZones(
    worldMask,
    heatZoneMap,
    heightmap,
    zones,
    dimensions,
    space,
    signal,
    report
  );
  const coastWeights = buildCoastWeights(grid);
  fillEmptyCells(grid);
  blurGrid(grid);

  const bands = createTemperatureBands(random, dimensions);
  const temperatureMap = sampleGrid(input, grid, coastWeights, bands);
  return temperatureMap;
}

function accumulateHeatZones(
  worldMask: Uint8Array,
  heatZoneMap: Int16Array,
  heightmap: Float32Array,
  zones: readonly HeatZoneConfig[],
  dimensions: WorldDimensions,
  space: WorldSpace,
  signal: AbortSignal | undefined,
  report: ((progress: number) => void) | undefined
): CoarseTemperatureGrid {
  const { sampleWidth, sampleHeight } = dimensions;
  const width = Math.max(1, Math.min(CLIMATE_BASE_GRID_SIDE, sampleWidth));
  const height = Math.max(1, Math.min(CLIMATE_BASE_GRID_SIDE, sampleHeight));
  const values = new Float32Array(width * height);
  const counts = new Uint32Array(width * height);
  const waterCounts = new Uint32Array(width * height);

  for (let y = 0; y < sampleHeight; y++) {
    if (signal?.aborted) {
      throw new GenerationCancelledError();
    }
    for (let x = 0; x < sampleWidth; x++) {
      const cell = y * sampleWidth + x;
      if (worldMask[cell] === 0) {
        continue;
      }
      const zone = zones[heatZoneMap[cell] ?? -1];
      if (!zone) {
        throw new Error('Heat-zone map contains a zone that is not configured.');
      }
      const point = space.cellToNormalized(x, y);
      const gridX = Math.min(width - 1, Math.floor(point.x * width));
      const gridY = Math.min(height - 1, Math.floor(point.y * height));
      const gridCell = gridY * width + gridX;
      values[gridCell] += HEAT_ZONE_TEMPERATURES[zone.thermal];
      counts[gridCell] += 1;
      if (heightmap[cell] <= 0) {
        waterCounts[gridCell] += 1;
      }
    }
    report?.(((y + 1) / sampleHeight) * 0.5);
  }

  for (let index = 0; index < values.length; index++) {
    const count = counts[index];
    if (count > 0) {
      values[index] /= count;
    }
  }

  return { values, counts, waterCounts, width, height };
}

/** Multi-source BFS: every empty grid cell takes the value of its nearest vote. */
function fillEmptyCells(grid: CoarseTemperatureGrid): void {
  const { values, counts, width, height } = grid;
  const total = width * height;
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  for (let index = 0; index < total; index++) {
    if (counts[index] > 0) {
      queue[tail++] = index;
    }
  }
  if (tail === 0 || tail === total) {
    return;
  }

  while (head < tail) {
    const index = queue[head++];
    const value = values[index];
    const x = index % width;
    const y = (index - x) / width;

    for (let offsetY = -1; offsetY <= 1; offsetY++) {
      const neighbourY = y + offsetY;
      if (neighbourY < 0 || neighbourY >= height) {
        continue;
      }
      for (let offsetX = -1; offsetX <= 1; offsetX++) {
        if (offsetX === 0 && offsetY === 0) {
          continue;
        }
        const neighbourX = x + offsetX;
        if (neighbourX < 0 || neighbourX >= width) {
          continue;
        }
        const neighbour = neighbourY * width + neighbourX;
        if (counts[neighbour] > 0) {
          continue;
        }
        counts[neighbour] = 1;
        values[neighbour] = value;
        queue[tail++] = neighbour;
      }
    }
  }
}

/**
 * Coastal reach of the sea on the coarse grid: water cells weigh 1, land loses
 * the maritime effect over a fixed share of the world, so the reach does not
 * depend on the raster resolution. The full-resolution modifier only applies it
 * to low land; shallow water uses its own depth fade.
 */
function buildCoastWeights(grid: CoarseTemperatureGrid): Float32Array {
  const { waterCounts, width, height } = grid;
  const total = width * height;
  const reach = Math.max(1, Math.round(Math.max(width, height) * CLIMATE_COAST_REACH_SHARE));
  const weights = new Float32Array(total);
  const distances = new Int16Array(total);
  distances.fill(-1);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  for (let index = 0; index < total; index++) {
    if (waterCounts[index] > 0) {
      weights[index] = 1;
      distances[index] = 0;
      queue[tail++] = index;
    }
  }

  while (head < tail) {
    const index = queue[head++];
    const distance = distances[index];
    if (distance >= reach) {
      continue;
    }
    const x = index % width;
    const y = (index - x) / width;

    for (let offsetY = -1; offsetY <= 1; offsetY++) {
      const neighbourY = y + offsetY;
      if (neighbourY < 0 || neighbourY >= height) {
        continue;
      }
      for (let offsetX = -1; offsetX <= 1; offsetX++) {
        if (offsetX === 0 && offsetY === 0) {
          continue;
        }
        const neighbourX = x + offsetX;
        if (neighbourX < 0 || neighbourX >= width) {
          continue;
        }
        const neighbour = neighbourY * width + neighbourX;
        if (distances[neighbour] !== -1) {
          continue;
        }
        const step = distance + 1;
        distances[neighbour] = step;
        weights[neighbour] = 1 - step / (reach + 1);
        queue[tail++] = neighbour;
      }
    }
  }

  return weights;
}

/**
 * Broad Gaussian transition with clamped edges. BaseClimate keeps its zones
 * sharp; this blur is what turns them into a continuous climate field.
 */
function blurGrid(grid: CoarseTemperatureGrid): void {
  const { values, width, height } = grid;
  const sigmaX = Math.max(1, width * CLIMATE_BASE_BLUR_SIGMA_SHARE);
  const sigmaY = Math.max(1, height * CLIMATE_BASE_BLUR_SIGMA_SHARE);
  const radiusX = Math.max(1, Math.ceil(sigmaX * 3));
  const radiusY = Math.max(1, Math.ceil(sigmaY * 3));
  const kernelX = gaussianKernel(sigmaX, radiusX);
  const kernelY = gaussianKernel(sigmaY, radiusY);
  const horizontal = new Float32Array(values.length);

  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let offset = -radiusX; offset <= radiusX; offset++) {
        const sampleX = Math.min(width - 1, Math.max(0, x + offset));
        sum += values[row + sampleX] * kernelX[offset + radiusX];
      }
      horizontal[row + x] = sum;
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let offset = -radiusY; offset <= radiusY; offset++) {
        const sampleY = Math.min(height - 1, Math.max(0, y + offset));
        sum += horizontal[sampleY * width + x] * kernelY[offset + radiusY];
      }
      values[y * width + x] = sum;
    }
  }
}

/** Normalized Gaussian weights for one axis. */
function gaussianKernel(sigma: number, radius: number): Float32Array {
  const kernel = new Float32Array(radius * 2 + 1);
  let total = 0;
  for (let offset = -radius; offset <= radius; offset++) {
    const weight = Math.exp(-(offset * offset) / (2 * sigma * sigma));
    kernel[offset + radius] = weight;
    total += weight;
  }
  for (let index = 0; index < kernel.length; index++) {
    kernel[index] /= total;
  }
  return kernel;
}

function sampleGrid(
  input: TemperatureFieldInput,
  grid: CoarseTemperatureGrid,
  coastWeights: Float32Array,
  bands: TemperatureBands
): Float32Array {
  const { worldMask, heightmap, oceanCurrentStrength, dimensions, space, signal, report } = input;
  const { sampleWidth, sampleHeight } = dimensions;
  const { values, width, height } = grid;
  const temperatureMap = new Float32Array(sampleWidth * sampleHeight);

  for (let y = 0; y < sampleHeight; y++) {
    if (signal?.aborted) {
      throw new GenerationCancelledError();
    }
    for (let x = 0; x < sampleWidth; x++) {
      const cell = y * sampleWidth + x;
      if (worldMask[cell] === 0) {
        continue;
      }

      const point = space.cellToNormalized(x, y);
      const warpX = bands.warpX(point) * CLIMATE_WARP_AMPLITUDE;
      const warpY = bands.warpY(point) * CLIMATE_WARP_AMPLITUDE;
      const base = sampleField(
        values,
        width,
        height,
        clamp(point.x + warpX, 0, 1),
        clamp(point.y + warpY, 0, 1)
      );

      const elevation = heightmap[cell];
      let temperature = base - (Math.max(0, elevation) / 1000) * CLIMATE_LAPSE_PER_1000_METERS;

      const coast = sampleField(coastWeights, width, height, point.x, point.y);
      const coastalFactor = coastFactor(elevation, coast);
      const current = oceanCurrentStrength[cell];
      const moderation = Math.min(
        1,
        CLIMATE_COAST_MODERATION * coastalFactor * (1 + CLIMATE_CURRENT_MODERATION_BOOST * current)
      );
      temperature += (CLIMATE_COAST_TARGET - temperature) * moderation;
      temperature += bands.temperature(point) * CLIMATE_TEMPERATURE_NOISE_AMPLITUDE;

      temperatureMap[cell] = clamp01(temperature);
    }

    report?.(0.5 + ((y + 1) / sampleHeight) * 0.5);
  }

  return temperatureMap;
}

/** Shallow water fades with depth; low land fades with height and distance from the sea. */
function coastFactor(elevation: number, coast: number): number {
  if (elevation <= 0) {
    return clamp01(1 + elevation / CLIMATE_SHALLOW_WATER_METERS);
  }
  const lowland = clamp01(1 - elevation / CLIMATE_LOWLAND_METERS);
  return coast * lowland;
}

function sampleField(
  field: Float32Array,
  width: number,
  height: number,
  u: number,
  v: number
): number {
  const gridX = clamp(u * width - 0.5, 0, width - 1);
  const gridY = clamp(v * height - 0.5, 0, height - 1);
  const x0 = Math.floor(gridX);
  const y0 = Math.floor(gridY);
  const x1 = Math.min(x0 + 1, width - 1);
  const y1 = Math.min(y0 + 1, height - 1);
  const fractionX = gridX - x0;
  const fractionY = gridY - y0;
  const top = field[y0 * width + x0] * (1 - fractionX) + field[y0 * width + x1] * fractionX;
  const bottom = field[y1 * width + x0] * (1 - fractionX) + field[y1 * width + x1] * fractionX;
  return top * (1 - fractionY) + bottom * fractionY;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
