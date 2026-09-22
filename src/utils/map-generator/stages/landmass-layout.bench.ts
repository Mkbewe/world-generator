import { bench, describe } from 'vitest';

import { DEFAULT_LANDMASS_CONFIG } from './landmass-defaults';
import { createStructure, type StructureSeed } from './landmass-layout';
import { LandmassLayoutStage } from './landmass-layout-stage';
import { containsWorld } from '../../world-shape';
import { MapContext } from '../context';
import { RandomFactory } from '../random/random-factory';
import type { MapConfig } from '../types';

/** World resolutions the baseline compares, in sample cells per axis. */
const RESOLUTIONS = [256, 512, 1024, 2048];

/** Seed shared by every measured case, so runs stay comparable. */
const SEED = 17;

function config(resolution: number): MapConfig {
  return {
    world: {
      dimensions: {
        widthMeters: 2,
        heightMeters: 2,
        sampleWidth: resolution,
        sampleHeight: resolution,
      },
      seed: SEED,
      shape: 'disc',
    },
    noise: { frequency: 4, octaves: 2, persistence: 0.5, lacunarity: 2 },
    landmasses: DEFAULT_LANDMASS_CONFIG,
  };
}

function discMask(resolution: number): Uint8Array {
  const mask = new Uint8Array(resolution * resolution);
  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      const inside = containsWorld(
        'disc',
        2 * (x / (resolution - 1)) - 1,
        2 * (y / (resolution - 1)) - 1
      );
      mask[y * resolution + x] = inside ? 1 : 0;
    }
  }
  return mask;
}

const masks = new Map(RESOLUTIONS.map(resolution => [resolution, discMask(resolution)]));

describe('landmass layout build', () => {
  bench('default structures', () => {
    const random = new RandomFactory(SEED).create('landmass-layout');
    const structures: StructureSeed[] = [];
    for (let index = 0; index < DEFAULT_LANDMASS_CONFIG.count; index++) {
      structures.push(createStructure(index, DEFAULT_LANDMASS_CONFIG, 'disc', random, structures));
    }
  });
});

for (const resolution of RESOLUTIONS) {
  describe(`landmass stage at ${resolution} x ${resolution}`, () => {
    bench('full stage', async () => {
      const stage = new LandmassLayoutStage();
      const context = new MapContext(config(resolution), { worldMask: masks.get(resolution) });
      await stage.execute(context, new AbortController().signal, () => {});
    });
  });
}
