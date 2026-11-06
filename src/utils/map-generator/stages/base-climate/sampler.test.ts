import { baseClimatePresetConfig } from './defaults';
import { createHeatZoneSampler } from './sampler';
import { planarDistance } from '../../space';
import type { BaseClimateConfig } from '../../types';

function zoneAt(config: BaseClimateConfig, x: number, y: number): number {
  return createHeatZoneSampler(config.zones, planarDistance)({ x, y });
}

describe('createHeatZoneSampler', () => {
  it('reads Earth-like bands from north to south', () => {
    const config = baseClimatePresetConfig('earth-like');

    expect(zoneAt(config, 0.5, 0.1)).toBe(0);
    expect(zoneAt(config, 0.5, 0.3)).toBe(1);
    expect(zoneAt(config, 0.5, 0.5)).toBe(2);
    expect(zoneAt(config, 0.5, 0.7)).toBe(3);
    expect(zoneAt(config, 0.5, 0.9)).toBe(4);
  });

  it('puts the temperate core, warm ring and cold rim in a ring world', () => {
    const config = baseClimatePresetConfig('ring-world');

    expect(config.zones.map(zone => zone.thermal)).toEqual(['temperate', 'warm', 'cold']);
    expect(zoneAt(config, 0.5, 0.5)).toBe(0);
    expect(zoneAt(config, 0.5, 0.25)).toBe(1);
    expect(zoneAt(config, 0, 0)).toBe(2);
  });

  it('puts the warm zone on the outside of a cold-core world', () => {
    const config = baseClimatePresetConfig('cold-core');

    expect(zoneAt(config, 0.5, 0.5)).toBe(0);
    expect(zoneAt(config, 0, 0)).toBe(2);
  });

  it('lets a later zone paint over an earlier one', () => {
    const config = baseClimatePresetConfig('earth-like');
    const overlapping: BaseClimateConfig = {
      ...config,
      zones: [
        config.zones[0],
        {
          ...config.zones[1],
          geometry: { kind: 'band', axis: 'y', center: 0.1, width: 0.2 },
        },
      ],
    };

    expect(zoneAt(overlapping, 0.5, 0.1)).toBe(1);
  });

  it('falls back to the nearest zone outside every geometry', () => {
    const config: BaseClimateConfig = {
      geologyCoupling: 1,
      currents: [],
      zones: [
        {
          id: 'middle',
          label: 'Middle',
          thermal: 'warm',
          geometry: { kind: 'band', axis: 'y', center: 0.5, width: 0.1 },
        },
      ],
    };

    expect(zoneAt(config, 0.5, 0)).toBe(0);
    expect(zoneAt(config, 0.5, 1)).toBe(0);
  });

  it('requires at least one zone', () => {
    expect(() => createHeatZoneSampler([], planarDistance)).toThrow('At least one heat zone');
  });
});
