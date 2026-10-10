import { createNoise2D } from 'simplex-noise';

import type { RandomFactory } from './random-factory';
import type { WorldDimensions } from '../../world-dimensions';
import type { WorldPoint } from '../types';

/** Continuous deterministic 2D noise in the -1..1 range. */
export type Noise2D = (x: number, y: number) => number;

/** Octave stack over a noise primitive; frequency is in cycles per domain unit. */
export interface FractalNoiseSpec {
  readonly frequency: number;
  readonly octaves: number;
  readonly persistence: number;
  readonly lacunarity: number;
}

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

/** Octave defaults of a world-space band. */
const DEFAULT_BAND_OCTAVES = 4;
const DEFAULT_BAND_PERSISTENCE = 0.5;
const DEFAULT_BAND_LACUNARITY = 2;

/**
 * One seeded noise source of a stage: the world seed comes from the config,
 * the namespace names the stage's stream. Components are addressed by suffix
 * (`scalar(spec, 'x')`), so a stage can take as many as it needs without
 * changing this class. The preview rebuilds the same source from the seed.
 *
 * Engine decision (GEO-02): stay on `simplex-noise`, which is already typed,
 * deterministic and continuous; `fastnoise-lite` from `docs/libraries-audit.md`
 * is rejected for now — it has no bundled types, no confirmed periodic noise,
 * and it would change every seed's output without a benefit this field needs.
 */
export class NoiseSource {
  constructor(
    private readonly random: RandomFactory,
    private readonly namespace: string
  ) {}

  /** Octave-stacked 2D noise of this source's named stream, in -1..1. */
  scalar(spec: FractalNoiseSpec, suffix?: string): Noise2D {
    return this.fractal(this.createNoise(suffix), spec);
  }

  /** One isotropic band in physical metres, independent of the raster resolution. */
  band(dimensions: WorldDimensions, spec: WorldNoiseBandSpec): WorldNoiseReader {
    if (!Number.isFinite(spec.wavelengthMeters) || spec.wavelengthMeters <= 0) {
      throw new RangeError('Noise band wavelength in meters must be a positive number.');
    }
    const primitive = this.createNoise();
    const cyclesX = dimensions.widthMeters / spec.wavelengthMeters;
    const cyclesY = dimensions.heightMeters / spec.wavelengthMeters;
    const fractal = this.fractal((x, y) => primitive(x * cyclesX, y * cyclesY), {
      frequency: 1,
      octaves: spec.octaves ?? DEFAULT_BAND_OCTAVES,
      persistence: spec.persistence ?? DEFAULT_BAND_PERSISTENCE,
      lacunarity: spec.lacunarity ?? DEFAULT_BAND_LACUNARITY,
    });
    return point => fractal(point.x, point.y);
  }

  /** Primitive of this source's named stream; the suffix is part of the name. */
  private createNoise(suffix?: string): Noise2D {
    const name = suffix === undefined ? this.namespace : `${this.namespace}.${suffix}`;
    const stream = this.random.create(name);
    return createNoise2D(() => stream.next());
  }

  /** Sums the octaves of a primitive into one continuous field, normalized to -1..1. */
  private fractal(noise: Noise2D, spec: FractalNoiseSpec): Noise2D {
    this.validateSpec(spec);
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

  /** Throws when an octave stack leaves its domain. */
  private validateSpec(spec: FractalNoiseSpec): void {
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
}
