import {
  createSeededNoise2D,
  createWorldNoiseBand,
  DEFAULT_BAND_LACUNARITY,
  DEFAULT_BAND_OCTAVES,
  DEFAULT_BAND_PERSISTENCE,
  fractalNoise2D,
  type Noise2D,
} from './noise';
import { RandomFactory } from './random-factory';
import type { WorldDimensions } from '../../world-dimensions';

const DIMENSIONS: WorldDimensions = {
  widthMeters: 2000,
  heightMeters: 1000,
  sampleWidth: 200,
  sampleHeight: 100,
};

const SPEC = { wavelengthMeters: 500, octaves: 3, persistence: 0.5, lacunarity: 2 } as const;

function sampleGrid(sample: Noise2D, steps = 16): number[] {
  const values: number[] = [];
  for (let y = 0; y < steps; y++) {
    for (let x = 0; x < steps; x++) {
      values.push(sample(x / (steps - 1), y / (steps - 1)));
    }
  }
  return values;
}

function pointGrid(reader: (point: { x: number; y: number }) => number, steps = 16): number[] {
  const values: number[] = [];
  for (let y = 0; y < steps; y++) {
    for (let x = 0; x < steps; x++) {
      values.push(reader({ x: x / (steps - 1), y: y / (steps - 1) }));
    }
  }
  return values;
}

describe('createSeededNoise2D', () => {
  it('is deterministic for the same seed and namespace', () => {
    const first = createSeededNoise2D(new RandomFactory(17), 'stage.a');
    const second = createSeededNoise2D(new RandomFactory(17), 'stage.a');

    expect(sampleGrid(second)).toEqual(sampleGrid(first));
  });

  it('decorrelates streams across namespaces and seeds', () => {
    const base = sampleGrid(createSeededNoise2D(new RandomFactory(17), 'stage.a'));

    expect(sampleGrid(createSeededNoise2D(new RandomFactory(17), 'stage.b'))).not.toEqual(base);
    expect(sampleGrid(createSeededNoise2D(new RandomFactory(18), 'stage.a'))).not.toEqual(base);
  });
});

describe('fractalNoise2D', () => {
  it('stays within the -1..1 range', () => {
    const fractal = fractalNoise2D(createSeededNoise2D(new RandomFactory(17), 'range'), {
      frequency: 4,
      octaves: 4,
      persistence: 0.5,
      lacunarity: 2,
    });
    const values = sampleGrid(fractal);

    expect(Math.min(...values)).toBeGreaterThanOrEqual(-1);
    expect(Math.max(...values)).toBeLessThanOrEqual(1);
  });

  it.each([
    ['frequency', { frequency: 0 }],
    ['octaves', { octaves: 0 }],
    ['persistence', { persistence: -1 }],
    ['lacunarity', { lacunarity: 0 }],
  ] as const)('rejects an invalid %s', (_name, patch) => {
    const spec = { frequency: 4, octaves: 2, persistence: 0.5, lacunarity: 2, ...patch };

    expect(() => fractalNoise2D((x, y) => x + y, spec)).toThrow(RangeError);
  });
});

describe('createWorldNoiseBand', () => {
  it('is deterministic for the same seed, namespace and spec', () => {
    const first = createWorldNoiseBand(new RandomFactory(17), 'terrain.medium', DIMENSIONS, SPEC);
    const second = createWorldNoiseBand(new RandomFactory(17), 'terrain.medium', DIMENSIONS, SPEC);

    expect(pointGrid(second)).toEqual(pointGrid(first));
  });

  it('decorrelates bands across namespaces', () => {
    const medium = createWorldNoiseBand(new RandomFactory(17), 'terrain.medium', DIMENSIONS, SPEC);
    const fine = createWorldNoiseBand(new RandomFactory(17), 'terrain.fine', DIMENSIONS, SPEC);

    expect(pointGrid(fine)).not.toEqual(pointGrid(medium));
  });

  it('stays continuous between adjacent samples', () => {
    const band = createWorldNoiseBand(new RandomFactory(17), 'terrain.fine', DIMENSIONS, SPEC);
    const epsilon = 1e-6;
    let maxStep = 0;

    for (let step = 1; step < 200; step++) {
      const x = step / 200;
      maxStep = Math.max(maxStep, Math.abs(band({ x: x + epsilon, y: 0.5 }) - band({ x, y: 0.5 })));
    }

    expect(maxStep).toBeLessThan(1e-3);
  });

  it('keeps the raw band identical across raster resolutions', () => {
    const coarse: WorldDimensions = { ...DIMENSIONS, sampleWidth: 50, sampleHeight: 25 };
    const fine: WorldDimensions = { ...DIMENSIONS, sampleWidth: 400, sampleHeight: 200 };
    const coarseBand = createWorldNoiseBand(new RandomFactory(17), 'terrain.large', coarse, SPEC);
    const fineBand = createWorldNoiseBand(new RandomFactory(17), 'terrain.large', fine, SPEC);

    for (const point of [
      { x: 0.1, y: 0.2 },
      { x: 0.5, y: 0.5 },
      { x: 0.83, y: 0.41 },
    ]) {
      expect(fineBand(point)).toBe(coarseBand(point));
    }
  });

  it('rejects a non-positive wavelength', () => {
    expect(() =>
      createWorldNoiseBand(new RandomFactory(17), 'terrain.fine', DIMENSIONS, {
        wavelengthMeters: 0,
      })
    ).toThrow(RangeError);
  });

  it('applies the documented octave defaults', () => {
    const implicit = createWorldNoiseBand(new RandomFactory(17), 'terrain.fine', DIMENSIONS, {
      wavelengthMeters: 500,
    });
    const explicit = createWorldNoiseBand(new RandomFactory(17), 'terrain.fine', DIMENSIONS, {
      wavelengthMeters: 500,
      octaves: DEFAULT_BAND_OCTAVES,
      persistence: DEFAULT_BAND_PERSISTENCE,
      lacunarity: DEFAULT_BAND_LACUNARITY,
    });

    expect(implicit({ x: 0.4, y: 0.6 })).toBe(explicit({ x: 0.4, y: 0.6 }));
  });
});
