import { NoiseSource, type RandomFactory } from './random';

export interface DisplacementOffsets {
  x: number;
  y: number;
}

export type DisplacementField = (x: number, y: number, out: DisplacementOffsets) => void;

/** Two octaves at three base cycles across the normalized world. */
const NOISE_SPEC = {
  frequency: 3,
  octaves: 2,
  persistence: 0.5,
  lacunarity: 2,
} as const;

/** Deterministic offset field that bends otherwise straight boundaries. */
export function createDisplacementField(
  random: RandomFactory,
  namespace: string
): DisplacementField {
  const noise = new NoiseSource(random, namespace);
  const shiftX = noise.scalar(NOISE_SPEC, 'x');
  const shiftY = noise.scalar(NOISE_SPEC, 'y');

  return (x, y, out) => {
    out.x = shiftX(x, y);
    out.y = shiftY(x, y);
  };
}
