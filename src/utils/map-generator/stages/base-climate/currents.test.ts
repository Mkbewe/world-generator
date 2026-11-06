import { createOceanCurrentSampler, type OceanCurrentSample } from './currents';
import { baseClimatePresetConfig } from './defaults';
import { planarDistance } from '../../space';
import type { BaseClimateConfig, OceanCurrentConfig } from '../../types';

function sample(config: BaseClimateConfig, x: number, y: number): OceanCurrentSample {
  const result: OceanCurrentSample = { angle: 0, strength: 0 };
  createOceanCurrentSampler(config.currents, planarDistance)({ x, y }, result);
  return result;
}

function source(
  center: { x: number; y: number },
  flow: OceanCurrentConfig['flow'],
  strength = 1,
  radius = 0.5
): OceanCurrentConfig {
  return { center, flow, strength, radius };
}

describe('createOceanCurrentSampler', () => {
  it('sums four subtropical gyres for the Earth-like preset', () => {
    const config = baseClimatePresetConfig('earth-like');

    expect(config.currents).toHaveLength(4);
    expect(sample(config, 0.35, 0.3).angle).toBeCloseTo(Math.PI / 2);
    expect(sample(config, 0.35, 0.7).angle).toBeCloseTo((Math.PI * 3) / 2);
  });

  it('turns ring-world currents into an outward spiral and cold-core currents inward', () => {
    const ringWorld = baseClimatePresetConfig('ring-world');
    const coldCore = baseClimatePresetConfig('cold-core');
    const angle = sample(ringWorld, 0.75, 0.5).angle;

    expect(angle).toBeCloseTo(Math.atan2(0.45, 0.55));
    expect(angle).toBeGreaterThan(0);
    expect(angle).toBeLessThan(Math.PI / 2);
    expect(sample(coldCore, 0.75, 0.5).angle).toBeCloseTo(Math.PI);
  });

  it('sums overlapping source vectors instead of averaging their angles', () => {
    const config: BaseClimateConfig = {
      ...baseClimatePresetConfig('ring-world'),
      currents: [
        source({ x: 0.5, y: 0.5 }, 'outward', 1, 1),
        source({ x: 0.5, y: 0.5 }, 'clockwise', 1, 1),
      ],
    };

    const east = sample(config, 0.75, 0.5);

    expect(east.angle).toBeCloseTo(Math.PI / 4);
    expect(east.strength).toBe(1);
  });

  it('returns a zero vector outside every source', () => {
    const config: BaseClimateConfig = {
      ...baseClimatePresetConfig('ring-world'),
      currents: [source({ x: 0.5, y: 0.5 }, 'clockwise', 1, 0.1)],
    };

    expect(sample(config, 0, 0)).toEqual({ angle: 0, strength: 0 });
  });

  it('clamps the summed strength to one', () => {
    const config: BaseClimateConfig = {
      ...baseClimatePresetConfig('ring-world'),
      currents: [
        source({ x: 0.5, y: 0.5 }, 'outward', 1, 1),
        source({ x: 0.5, y: 0.5 }, 'outward', 1, 1),
      ],
    };

    expect(sample(config, 0.75, 0.5).strength).toBe(1);
  });
});
