import { MapLayer } from './layer';
import { regionColor } from './macro-region-palette';
import type { SpatialMask } from '../types';

/** Discrete macro-region ids rendered as distinct flat colors. */
export class MacroRegionLayer extends MapLayer {
  constructor(
    readonly world: SpatialMask,
    readonly regions: Uint8Array
  ) {
    super('macro-region', world.size);
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
      const [red, green, blue] = regionColor(this.regions[index]);
      pixels[offset] = red;
      pixels[offset + 1] = green;
      pixels[offset + 2] = blue;
      pixels[offset + 3] = 255;
    }
  }
}
