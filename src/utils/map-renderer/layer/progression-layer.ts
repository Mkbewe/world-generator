import { MapLayer } from './layer';
import type { MapBaseLayerId, SpatialMask } from '../types';

type Color = readonly [number, number, number];

const RAMP: readonly { at: number; color: Color }[] = [
  { at: 0, color: [27, 94, 32] },
  { at: 0.5, color: [249, 168, 37] },
  { at: 1, color: [183, 28, 28] },
];

/** Continuous 0..1 progression/danger field as a green-yellow-red gradient. */
export class ProgressionLayer extends MapLayer {
  constructor(
    readonly world: SpatialMask,
    readonly progression: Float32Array
  ) {
    super('progression' as MapBaseLayerId, world.size);
  }

  protected paintRow(
    pixels: Uint8ClampedArray,
    offset: number,
    y: number,
    xStart: number,
    xEnd: number
  ): void {
    let index = y * this.size.width + xStart;
    for (let x = xStart; x < xEnd; x++, index++, offset += 4) {
      if (!this.world.contains(x, y)) {
        continue;
      }
      const [red, green, blue] = rampColor(this.progression[index]);
      pixels[offset] = red;
      pixels[offset + 1] = green;
      pixels[offset + 2] = blue;
      pixels[offset + 3] = 255;
    }
  }
}

function rampColor(value: number): Color {
  const clamped = Math.min(1, Math.max(0, value));
  for (let index = 1; index < RAMP.length; index++) {
    const to = RAMP[index];
    if (clamped <= to.at) {
      const from = RAMP[index - 1];
      const t = (clamped - from.at) / (to.at - from.at);
      return mix(from.color, to.color, t);
    }
  }
  return RAMP.at(-1)!.color;
}

function mix(from: Color, to: Color, t: number): Color {
  return [
    Math.round(from[0] + (to[0] - from[0]) * t),
    Math.round(from[1] + (to[1] - from[1]) * t),
    Math.round(from[2] + (to[2] - from[2]) * t),
  ];
}
