import { createNoise2D } from 'simplex-noise';

import type { MapContext } from '../context';
import { GenerationCancelledError } from '../errors';
import type { MapStage } from '../stage';
import type { MapConfig, MapState } from '../types';

export class NoiseStage implements MapStage<MapConfig, MapState> {
  readonly id = 'noise';
  readonly name = 'Noise generation';

  async execute(context: MapContext<MapConfig, MapState>, signal: AbortSignal): Promise<void> {
    const { width, height } = context.config.world;
    const { frequency, octaves, persistence, lacunarity } = context.config.noise;
    const worldMask = context.state.worldMask;

    this.validateConfig(context.config);

    if (!worldMask || worldMask.length !== width * height) {
      throw new Error('A valid world mask must be generated before noise.');
    }

    const random = context.random.create(this.id);
    const noise2D = createNoise2D(() => random.next());
    const noiseMap = new Float32Array(width * height);
    const xDivisor = Math.max(1, width - 1);
    const yDivisor = Math.max(1, height - 1);

    for (let y = 0; y < height; y++) {
      if (signal.aborted) {
        throw new GenerationCancelledError();
      }

      const worldY = y / yDivisor;

      for (let x = 0; x < width; x++) {
        const index = y * width + x;

        if (worldMask[index] === 0) {
          continue;
        }

        const worldX = x / xDivisor;
        let amplitude = 1;
        let octaveFrequency = frequency;
        let noiseValue = 0;
        let amplitudeSum = 0;

        for (let octave = 0; octave < octaves; octave++) {
          noiseValue += noise2D(worldX * octaveFrequency, worldY * octaveFrequency) * amplitude;
          amplitudeSum += amplitude;
          amplitude *= persistence;
          octaveFrequency *= lacunarity;
        }

        const normalizedNoise = noiseValue / amplitudeSum;
        noiseMap[index] = (normalizedNoise + 1) / 2;
      }
    }

    context.state.noiseMap = noiseMap;
  }

  private validateConfig(config: MapConfig): void {
    const { width, height, seed } = config.world;
    const { frequency, octaves, persistence, lacunarity } = config.noise;

    if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
      throw new RangeError('World width and height must be positive integers.');
    }

    if (!Number.isFinite(seed)) {
      throw new RangeError('World seed must be a finite number.');
    }

    if (!Number.isFinite(frequency) || frequency <= 0) {
      throw new RangeError('Noise frequency must be greater than zero.');
    }

    if (!Number.isInteger(octaves) || octaves <= 0) {
      throw new RangeError('Noise octaves must be a positive integer.');
    }

    if (!Number.isFinite(persistence) || persistence <= 0) {
      throw new RangeError('Noise persistence must be greater than zero.');
    }

    if (!Number.isFinite(lacunarity) || lacunarity <= 0) {
      throw new RangeError('Noise lacunarity must be greater than zero.');
    }
  }
}
