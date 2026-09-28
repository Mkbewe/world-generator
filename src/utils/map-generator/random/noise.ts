import { createNoise2D } from 'simplex-noise';

import type { RandomFactory } from './random-factory';
import type { WorldDimensions } from '../../world-dimensions';
import type { WorldPoint } from '../types';

/**
 * Shared noise port for pipeline stages. Engine decision (GEO-02): stay on
 * `simplex-noise`, which is already typed, deterministic and continuous;
 * `fastnoise-lite` from `docs/libraries-audit.md` is rejected for now — it has
 * no bundled types, no confirmed periodic noise, and it would change every
 * seed's output without a benefit this field needs.
 */

/** Continuous deterministic 2D noise in the -1..1 range. */
export type Noise2D = (x: number, y: number) => number;

/** Octave stack over a noise primitive; frequency is in cycles per domain unit. */
export interface FractalNoiseSpec {
  readonly frequency: number;
  readonly octaves: number;
  readonly persistence: number;
  readonly lacunarity: number;
}

/** Builds the seeded primitive of one named stage stream. */
export function createSeededNoise2D(random: RandomFactory, namespace: string): Noise2D {
  const stream = random.create(namespace);
  return createNoise2D(() => stream.next());
}

/** Throws when an octave stack leaves its domain. */
export function validateFractalNoiseSpec(spec: FractalNoiseSpec): void {
  if (!Number.isFinite(spec.frequency) || spec.frequency <= 0) {
    throw new RangeError('Noise frequency must be greater than zero.');
  }
  if (!Number.isInteger(spec.octaves) || spec.octaves <= 0) {
    throw new RangeError('Noise octaves must be a positive integer.');
  }
  if (!Number.isFinite(spec.persistence) || spec.persistence <= 0) {
    throw new RangeError('Noise persistence must be greater than zero.');
  }
  if (!Number.isFinite(spec.lacunarity) || spec.lacunarity <= 0) {
    throw new RangeError('Noise lacunarity must be greater than zero.');
  }
}

/**
 * Sums the octaves of a noise primitive into one continuous field, normalized
 * to -1..1. Sampling happens at the domain point times the octave frequency, so
 * the same point yields the same value whatever raster samples it.
 */
export function fractalNoise2D(noise: Noise2D, spec: FractalNoiseSpec): Noise2D {
  validateFractalNoiseSpec(spec);
  const frequencies: number[] = [];
  const amplitudes: number[] = [];
  let amplitudeSum = 0;
  let frequency = spec.frequency;
  let amplitude = 1;

  for (let octave = 0; octave < spec.octaves; octave++) {
    frequencies.push(frequency);
    amplitudes.push(amplitude);
    amplitudeSum += amplitude;
    frequency *= spec.lacunarity;
    amplitude *= spec.persistence;
  }

  return (x, y) => {
    let value = 0;
    for (let octave = 0; octave < frequencies.length; octave++) {
      value += noise(x * frequencies[octave], y * frequencies[octave]) * amplitudes[octave];
    }
    return value / amplitudeSum;
  };
}

/** Octave defaults of a world-space band. */
export const DEFAULT_BAND_OCTAVES = 4;
export const DEFAULT_BAND_PERSISTENCE = 0.5;
export const DEFAULT_BAND_LACUNARITY = 2;

/** Physical description of one world-space band. */
export interface WorldNoiseBandSpec {
  /** Length of the base wave in metres; must be positive. */
  readonly wavelengthMeters: number;
  readonly octaves?: number;
  readonly persistence?: number;
  readonly lacunarity?: number;
}

/** One band sample at a normalized world point, in -1..1. */
export type WorldNoiseReader = (point: WorldPoint) => number;

/**
 * Builds one isotropic band in physical metres: the wavelength is the same
 * along both axes even when the world is not square. The raw band does not
 * depend on the raster resolution; damping below the sample scale belongs to
 * the field, not the port.
 */
export function createWorldNoiseBand(
  random: RandomFactory,
  namespace: string,
  dimensions: WorldDimensions,
  spec: WorldNoiseBandSpec
): WorldNoiseReader {
  if (!Number.isFinite(spec.wavelengthMeters) || spec.wavelengthMeters <= 0) {
    throw new RangeError('Noise band wavelength in meters must be a positive number.');
  }
  const primitive = createSeededNoise2D(random, namespace);
  const cyclesX = dimensions.widthMeters / spec.wavelengthMeters;
  const cyclesY = dimensions.heightMeters / spec.wavelengthMeters;
  const fractal = fractalNoise2D((x, y) => primitive(x * cyclesX, y * cyclesY), {
    frequency: 1,
    octaves: spec.octaves ?? DEFAULT_BAND_OCTAVES,
    persistence: spec.persistence ?? DEFAULT_BAND_PERSISTENCE,
    lacunarity: spec.lacunarity ?? DEFAULT_BAND_LACUNARITY,
  });
  return point => fractal(point.x, point.y);
}
