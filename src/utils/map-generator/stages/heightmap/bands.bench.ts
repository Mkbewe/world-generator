import { bench, describe } from 'vitest';

import { createHeightmapNoiseBands, type HeightmapNoiseBands } from './bands';
import { RandomFactory } from '../../random';

/** Grid resolutions the benchmark samples, in cells per axis. */
const RESOLUTIONS = [512, 1024, 2048];

const DIMENSIONS = {
  widthMeters: 4000,
  heightMeters: 4000,
  sampleWidth: 2000,
  sampleHeight: 2000,
};

function sampleBands(bands: HeightmapNoiseBands, resolution: number): number {
  let sum = 0;
  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      const point = { x: x / (resolution - 1), y: y / (resolution - 1) };
      sum += bands.large(point) + bands.medium(point) + bands.fine(point);
    }
  }
  return sum;
}

for (const resolution of RESOLUTIONS) {
  describe(`heightmap noise bands at ${resolution} x ${resolution}`, () => {
    const bands = createHeightmapNoiseBands(new RandomFactory(17), DIMENSIONS);
    bench('three bands per cell', () => {
      sampleBands(bands, resolution);
    });
  });
}
