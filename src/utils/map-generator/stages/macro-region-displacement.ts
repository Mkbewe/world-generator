import { createNoise2D } from 'simplex-noise';

import { RandomFactory } from '../random/random-factory';
import type { MacroRegionNoiseSource } from '../types';

/** Reads a noise value in the 0..1 range inside the world mask. */
export type NoiseSampler = (cellX: number, cellY: number) => number | undefined;

/**
 * Border offset: a scalar shifts the ring radius or the band axis (the
 * noise-map source), a vector moves the sampled point (the dedicated source).
 */
export type RegionOffset = number | { readonly x: number; readonly y: number };
/** Signed border displacement sampled at normalized map coordinates. */
export type RegionDisplacement = (x: number, y: number) => RegionOffset;

interface RegionDisplacementOptions {
  readonly source: MacroRegionNoiseSource;
  readonly seed: number;
  readonly width: number;
  readonly height: number;
  readonly noiseAt?: NoiseSampler;
}

/** One selection point shared by the worker and the preview renderer. */
export function createRegionDisplacement(options: RegionDisplacementOptions): RegionDisplacement {
  if (options.source === 'dedicated') {
    return createDedicatedDisplacement(options.seed);
  }
  if (options.source === 'noise-map' && options.noiseAt) {
    return createNoiseDisplacement(options.noiseAt, options.width, options.height);
  }
  throw new Error(`Invalid or unavailable region noise source: ${options.source}.`);
}

/** Matches the original two-channel region noise, independent of NoiseStage. */
function createDedicatedDisplacement(seed: number): RegionDisplacement {
  const random = new RandomFactory(seed).create('macro-region');
  const displacementX = createNoise2D(() => random.next());
  const displacementY = createNoise2D(() => random.next());

  return (x, y) => ({
    x: fbm(displacementX, x * 3, y * 3),
    y: fbm(displacementY, x * 3, y * 3),
  });
}

function fbm(noise: (x: number, y: number) => number, x: number, y: number): number {
  const first = noise(x, y);
  const second = noise(x * 2, y * 2) * 0.5;
  return (first + second) / 1.5;
}

/**
 * Interpolates valid samples without treating masked cells as zero noise.
 * Screen-space borders use the same displacement as the generated raster.
 */
export function createNoiseDisplacement(
  noiseAt: NoiseSampler,
  width: number,
  height: number
): (x: number, y: number) => number {
  return (x, y) => {
    const gridX = Math.max(0, Math.min(width - 1, x * (width - 1)));
    const gridY = Math.max(0, Math.min(height - 1, y * (height - 1)));
    const left = Math.floor(gridX);
    const top = Math.floor(gridY);
    const right = Math.min(left + 1, width - 1);
    const bottom = Math.min(top + 1, height - 1);
    const horizontal = gridX - left;
    const vertical = gridY - top;
    const corners: ReadonlyArray<readonly [number, number, number]> = [
      [left, top, (1 - horizontal) * (1 - vertical)],
      [right, top, horizontal * (1 - vertical)],
      [left, bottom, (1 - horizontal) * vertical],
      [right, bottom, horizontal * vertical],
    ];
    let weightedValue = 0;
    let weightSum = 0;

    for (const [cellX, cellY, weight] of corners) {
      if (weight <= 0) {
        continue;
      }
      const value = noiseAt(cellX, cellY);
      if (value === undefined) {
        continue;
      }
      weightedValue += value * weight;
      weightSum += weight;
    }

    if (weightSum > 0) {
      return (weightedValue / weightSum) * 2 - 1;
    }
    // The smooth world edge can pass between four masked-out cell centres.
    const nearest = nearestValidSample(noiseAt, width, height, gridX, gridY);
    return nearest === undefined ? 0 : nearest * 2 - 1;
  };
}

function nearestValidSample(
  noiseAt: NoiseSampler,
  width: number,
  height: number,
  gridX: number,
  gridY: number
): number | undefined {
  const centerX = Math.round(gridX);
  const centerY = Math.round(gridY);
  for (let radius = 1; radius <= 2; radius++) {
    let closest: number | undefined;
    let closestDistance = Infinity;
    const minY = Math.max(0, centerY - radius);
    const maxY = Math.min(height - 1, centerY + radius);
    const minX = Math.max(0, centerX - radius);
    const maxX = Math.min(width - 1, centerX + radius);
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const value = noiseAt(x, y);
        const distance = (x - gridX) ** 2 + (y - gridY) ** 2;
        if (value !== undefined && distance < closestDistance) {
          closest = value;
          closestDistance = distance;
        }
      }
    }
    if (closest !== undefined) {
      return closest;
    }
  }
  return undefined;
}
