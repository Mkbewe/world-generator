import { createBorderWarp as createNoiseBorderWarp } from '@generator/irregularity';
import type { WorldPoint } from '@generator/types';

import type { RegionPartitionInput } from './partition-types';
import { MAX_BORDER_DISPLACEMENT } from '../defaults';

/** Precomputed warped coordinates of every sampled cell, indexed by raster cell. */
export interface WarpSamples {
  readonly stride: number;
  readonly width: number;
  readonly x: Float32Array;
  readonly y: Float32Array;
}

/** Precomputes the warped position of every sampled cell once per pass. */
export function sampleWarp(
  input: RegionPartitionInput,
  warp: ((point: WorldPoint) => WorldPoint) | undefined,
  stride: number
): WarpSamples {
  const { dimensions, space } = input;
  const width = dimensions.sampleWidth;
  const height = dimensions.sampleHeight;
  const latticeWidth = Math.ceil(width / stride);
  const latticeHeight = Math.ceil(height / stride);
  const xs = new Float32Array(latticeWidth * latticeHeight);
  const ys = new Float32Array(latticeWidth * latticeHeight);
  for (let y = 0; y < height; y += stride) {
    for (let x = 0; x < width; x += stride) {
      const point = space.cellToNormalized(x, y);
      const warped = warp ? warp(point) : point;
      const index = (y / stride) * latticeWidth + x / stride;
      xs[index] = warped.x;
      ys[index] = warped.y;
    }
  }
  return { stride, width: latticeWidth, x: xs, y: ys };
}

/** Shared seeded warp of the sampled coordinate; the only border shaper. */
export function createBorderWarp(
  input: RegionPartitionInput
): ((point: WorldPoint) => WorldPoint) | undefined {
  return createNoiseBorderWarp(
    input.random,
    'geology.border-warp',
    input.layout.irregularity * MAX_BORDER_DISPLACEMENT
  );
}
