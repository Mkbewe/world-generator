import { paintMoisturePixels } from './moisture-overlay-renderer';
import { MOISTURE_STOPS } from '../../../map-layers';

describe('paintMoisturePixels', () => {
  it('paints the moisture ramp and clips to the world mask', () => {
    const pixels = new Uint8ClampedArray(8);
    const world = {
      size: { width: 2, height: 1 },
      contains: (x: number) => x === 0,
    };

    paintMoisturePixels(pixels, new Float32Array([0, 1]), world);

    expect([...pixels.slice(0, 4)]).toEqual([...MOISTURE_STOPS[0].color, 125]);
    expect([...pixels.slice(4, 8)]).toEqual([0, 0, 0, 0]);
  });
});
