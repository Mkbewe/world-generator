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

/** Shared noisy border warp for any normalized-space border feature. */
export function createBorderWarp(
  random: RandomFactory,
  namespace: string,
  amount: number
): ((point: { x: number; y: number }) => { x: number; y: number }) | undefined {
  if (amount === 0) {
    return undefined;
  }
  const noise = new NoiseSource(random, namespace);
  const noiseX = noise.scalar(NOISE_SPEC, 'x');
  const noiseY = noise.scalar(NOISE_SPEC, 'y');

  return point => ({
    x: point.x + noiseX(point.x, point.y) * amount,
    y: point.y + noiseY(point.x, point.y) * amount,
  });
}

/** Deterministic offset field that bends otherwise straight boundaries. */
export function createDisplacementField(
  random: RandomFactory,
  namespace: string
): DisplacementField {
  const warp = createBorderWarp(random, namespace, 1);
  if (!warp) {
    return (_x, _y, out) => {
      out.x = 0;
      out.y = 0;
    };
  }

  return (x, y, out) => {
    const shifted = warp({ x, y });
    out.x = shifted.x - x;
    out.y = shifted.y - y;
  };
}
