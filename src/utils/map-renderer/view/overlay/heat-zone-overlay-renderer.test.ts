import { paintHeatZonePixels } from './heat-zone-overlay-renderer';
import type { HeatZoneInfo } from '../../../map-generator/info-definitions';
import { HEAT_ZONE_COLORS } from '../../../map-layers';

const zones: readonly HeatZoneInfo[] = [
  { id: 'cold', label: 'Cold', thermal: 'cold' },
  { id: 'temperate', label: 'Temperate', thermal: 'temperate' },
  { id: 'warm', label: 'Warm', thermal: 'warm' },
];

describe('paintHeatZonePixels', () => {
  it('colors every valid zone with its thermal class', () => {
    const pixels = new Uint8ClampedArray(16);

    paintHeatZonePixels(pixels, new Int16Array([0, 1, 2, -1]), zones);

    expect([...pixels.slice(0, 4)]).toEqual([...HEAT_ZONE_COLORS.cold, 140]);
    expect([...pixels.slice(4, 8)]).toEqual([...HEAT_ZONE_COLORS.temperate, 140]);
    expect([...pixels.slice(8, 12)]).toEqual([...HEAT_ZONE_COLORS.warm, 140]);
    expect([...pixels.slice(12, 16)]).toEqual([0, 0, 0, 0]);
  });

  it('leaves unknown indices and empty cells transparent', () => {
    const pixels = new Uint8ClampedArray(12);

    paintHeatZonePixels(pixels, new Int16Array([3, -1, 0]), zones);

    expect([...pixels.slice(0, 8)]).toEqual(new Array(8).fill(0));
    expect([...pixels.slice(8, 12)]).toEqual([...HEAT_ZONE_COLORS.cold, 140]);
  });
});
