import { createThermalAt } from './thermal';
import { createWorldSpace } from '../../space';
import type { HeatZoneClass } from '../../types';

const SPACE = createWorldSpace({ sampleWidth: 3, sampleHeight: 1 });
const ZONE_THERMALS: readonly HeatZoneClass[] = ['cold', 'warm'];

describe('createThermalAt', () => {
  it('maps a point to the thermal class of its heat-zone cell', () => {
    const thermalAt = createThermalAt(new Int16Array([0, 1, -1]), ZONE_THERMALS, SPACE);

    expect(thermalAt({ x: 0, y: 0 })).toBe('cold');
    expect(thermalAt({ x: 0.5, y: 0 })).toBe('warm');
  });

  it('falls back to temperate outside the world mask', () => {
    const thermalAt = createThermalAt(new Int16Array([0, 1, -1]), ZONE_THERMALS, SPACE);

    expect(thermalAt({ x: 1, y: 0 })).toBe('temperate');
  });

  it('rejects a heat-zone map with the wrong raster size', () => {
    expect(() => createThermalAt(new Int16Array([0]), ZONE_THERMALS, SPACE)).toThrow(
      /must match the world raster size/
    );
  });
});
