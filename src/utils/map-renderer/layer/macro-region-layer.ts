import { MapLayer } from './layer';
import type { MapBaseLayerId, SpatialMask } from '../types';

const REGION_COLORS: readonly (readonly [number, number, number])[] = [
  [46, 125, 50],
  [124, 179, 66],
  [253, 216, 53],
  [229, 57, 53],
  [142, 36, 170],
  [30, 136, 229],
  [255, 112, 67],
  [0, 137, 123],
];

const UNKNOWN_COLOR = [120, 120, 120] as const;

/** Discrete macro-region ids rendered as distinct flat colors. */
export class MacroRegionLayer extends MapLayer {
  constructor(
    readonly world: SpatialMask,
    readonly regions: Uint8Array
  ) {
    super('macro-region' as MapBaseLayerId, world.size);
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
      const [red, green, blue] =
        REGION_COLORS[this.regions[index] % REGION_COLORS.length] ?? UNKNOWN_COLOR;
      pixels[offset] = red;
      pixels[offset + 1] = green;
      pixels[offset + 2] = blue;
      pixels[offset + 3] = 255;
    }
  }
}
