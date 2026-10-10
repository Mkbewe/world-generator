import { type Noise2D, NoiseSource, type WorldNoiseReader } from './noise-source';
import { RandomFactory } from './random-factory';
import type { WorldDimensions } from '../../world-dimensions';

const SCALAR_SPEC = { frequency: 4, octaves: 4, persistence: 0.5, lacunarity: 2 };
const BAND_SPEC = { wavelengthMeters: 500, octaves: 3, persistence: 0.5, lacunarity: 2 } as const;

const DIMENSIONS: WorldDimensions = {
  widthMeters: 2000,
  heightMeters: 1000,
  sampleWidth: 200,
  sampleHeight: 100,
};

function sampleGrid(sample: Noise2D, steps = 16): number[] {
  const values: number[] = [];
  for (let y = 0; y < steps; y++) {
    for (let x = 0; x < steps; x++) {
      values.push(sample(x / (steps - 1), y / (steps - 1)));
    }
  }
  return values;
}

function pointGrid(reader: WorldNoiseReader, steps = 16): number[] {
  const values: number[] = [];
  for (let y = 0; y < steps; y++) {
    for (let x = 0; x < steps; x++) {
      values.push(reader({ x: x / (steps - 1), y: y / (steps - 1) }));
    }
  }
  return values;
}

describe('NoiseSource.scalar', () => {
  it('is deterministic for the same seed, namespace, suffix and spec', () => {
    const first = new NoiseSource(new RandomFactory(17), 'stage.a').scalar(SCALAR_SPEC, 'x');
    const second = new NoiseSource(new RandomFactory(17), 'stage.a').scalar(SCALAR_SPEC, 'x');

    expect(sampleGrid(second)).toEqual(sampleGrid(first));
  });

  it('decorrelates streams across suffixes, namespaces and seeds', () => {
    const base = sampleGrid(new NoiseSource(new RandomFactory(17), 'stage.a').scalar(SCALAR_SPEC));

    expect(
      sampleGrid(new NoiseSource(new RandomFactory(17), 'stage.a').scalar(SCALAR_SPEC, 'x'))
    ).not.toEqual(base);
    expect(
      sampleGrid(new NoiseSource(new RandomFactory(17), 'stage.b').scalar(SCALAR_SPEC))
    ).not.toEqual(base);
    expect(
      sampleGrid(new NoiseSource(new RandomFactory(18), 'stage.a').scalar(SCALAR_SPEC))
    ).not.toEqual(base);
  });

  it('stays within the -1..1 range', () => {
    const values = sampleGrid(new NoiseSource(new RandomFactory(17), 'range').scalar(SCALAR_SPEC));

    expect(Math.min(...values)).toBeGreaterThanOrEqual(-1);
    expect(Math.max(...values)).toBeLessThanOrEqual(1);
  });

  it.each([
    ['frequency', { frequency: 0 }],
    ['octaves', { octaves: 0 }],
    ['persistence', { persistence: -1 }],
    ['lacunarity', { lacunarity: 0 }],
  ] as const)('rejects an invalid %s', (_name, patch) => {
    const spec = { ...SCALAR_SPEC, ...patch };

    expect(() => new NoiseSource(new RandomFactory(17), 'stage').scalar(spec)).toThrow(RangeError);
  });
});

describe('NoiseSource.band', () => {
  it('is deterministic for the same seed, namespace and spec', () => {
    const first = new NoiseSource(new RandomFactory(17), 'terrain.medium').band(
      DIMENSIONS,
      BAND_SPEC
    );
    const second = new NoiseSource(new RandomFactory(17), 'terrain.medium').band(
      DIMENSIONS,
      BAND_SPEC
    );

    expect(pointGrid(second)).toEqual(pointGrid(first));
  });

  it('decorrelates bands across namespaces', () => {
    const medium = new NoiseSource(new RandomFactory(17), 'terrain.medium').band(
      DIMENSIONS,
      BAND_SPEC
    );
    const fine = new NoiseSource(new RandomFactory(17), 'terrain.fine').band(DIMENSIONS, BAND_SPEC);

    expect(pointGrid(fine)).not.toEqual(pointGrid(medium));
  });

  it('stays continuous between adjacent samples', () => {
    const band = new NoiseSource(new RandomFactory(17), 'terrain.fine').band(DIMENSIONS, BAND_SPEC);
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
    const coarseBand = new NoiseSource(new RandomFactory(17), 'terrain.large').band(
      coarse,
      BAND_SPEC
    );
    const fineBand = new NoiseSource(new RandomFactory(17), 'terrain.large').band(fine, BAND_SPEC);

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
      new NoiseSource(new RandomFactory(17), 'terrain.fine').band(DIMENSIONS, {
        wavelengthMeters: 0,
      })
    ).toThrow(RangeError);
  });

  it('applies the documented octave defaults', () => {
    const source = new NoiseSource(new RandomFactory(17), 'terrain.fine');
    const implicit = source.band(DIMENSIONS, { wavelengthMeters: 500 });
    const explicit = source.band(DIMENSIONS, {
      wavelengthMeters: 500,
      octaves: 4,
      persistence: 0.5,
      lacunarity: 2,
    });

    expect(implicit({ x: 0.4, y: 0.6 })).toBe(explicit({ x: 0.4, y: 0.6 }));
  });
});
