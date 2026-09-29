import { buildGeologyPlan as buildPlan, compareAreaIds, GeologyPlacementError } from './plan';
import { createGeologicalArea } from './presets';
import type { WorldShape } from '../../../world-shape';
import { RandomFactory } from '../../random';
import type { GeologicalAreaConfig, GeologyConfig } from '../../types';

const DIMENSIONS = { widthMeters: 2000, heightMeters: 2000, sampleWidth: 65, sampleHeight: 65 };

function buildGeologyPlan(config: unknown, factory: RandomFactory, shape: WorldShape) {
  return buildPlan(config, factory, shape, DIMENSIONS);
}

function area(id: string, overrides: Partial<GeologicalAreaConfig> = {}): GeologicalAreaConfig {
  return { ...createGeologicalArea(id, 'shallow-archipelago'), ...overrides };
}

function random(): RandomFactory {
  return new RandomFactory(17);
}

describe('buildGeologyPlan', () => {
  it('is deterministic for the same seed and configuration', () => {
    const config: GeologyConfig = { areas: [area('a'), area('b')] };

    expect(buildGeologyPlan(config, random(), 'rectangle')).toEqual(
      buildGeologyPlan(config, random(), 'rectangle')
    );
  });

  it('ignores the config list order and sorts areas by id', () => {
    const forward = buildGeologyPlan(
      { areas: [area('a'), area('b'), area('c')] },
      random(),
      'rectangle'
    );
    const reversed = buildGeologyPlan(
      { areas: [area('c'), area('b'), area('a')] },
      random(),
      'rectangle'
    );

    expect(reversed).toEqual(forward);
    expect(forward.areas.map(planned => planned.id)).toEqual(['a', 'b', 'c']);
  });

  it('keeps a fixed placement exact', () => {
    const config: GeologyConfig = {
      areas: [area('fixed', { placement: { kind: 'fixed', position: { x: 0.5, y: 0.5 } } })],
    };

    expect(buildGeologyPlan(config, random(), 'disc').areas[0].centre).toEqual({ x: 0.5, y: 0.5 });
  });

  it('spreads automatic areas instead of stacking them', () => {
    const plan = buildGeologyPlan({ areas: [area('a'), area('b')] }, random(), 'rectangle');
    const [first, second] = plan.areas;

    expect(
      Math.hypot(first.centre.x - second.centre.x, first.centre.y - second.centre.y)
    ).toBeGreaterThan(0.1);
  });

  it('reports an impossible placement per entry', () => {
    const config: GeologyConfig = {
      areas: [
        area('corner', {
          extent: 0.2,
          placement: { kind: 'fixed', position: { x: 0.02, y: 0.02 } },
        }),
      ],
    };

    try {
      buildGeologyPlan(config, random(), 'disc');
      throw new Error('Expected a placement problem.');
    } catch (error) {
      expect(error).toBeInstanceOf(GeologyPlacementError);
      if (error instanceof GeologyPlacementError) {
        expect(error.problems.map(problem => problem.areaId)).toEqual(['corner']);
      }
    }
  });

  it('keeps an earlier area in place when a later area is added', () => {
    const single = buildGeologyPlan({ areas: [area('a')] }, random(), 'rectangle');
    const extended = buildGeologyPlan({ areas: [area('a'), area('m')] }, random(), 'rectangle');

    expect(extended.areas.find(planned => planned.id === 'a')?.centre).toEqual(
      single.areas[0].centre
    );
  });

  it('rejects an invalid configuration with a readable error', () => {
    const broken = { areas: [{ ...area('bad'), relief: 'lava' }] };

    expect(() => buildGeologyPlan(broken, random(), 'rectangle')).toThrow(
      'relief must be a terrain character'
    );
  });

  it('keeps placement when only the relief changes and samples profiles in range', () => {
    const mountains = area('a', { relief: 'mountains' });
    const plains: GeologicalAreaConfig = { ...mountains, relief: 'plains' };
    const hilly = buildGeologyPlan({ areas: [mountains] }, random(), 'rectangle');
    const flat = buildGeologyPlan({ areas: [plains] }, random(), 'rectangle');

    expect(hilly.areas[0].centre).toEqual(flat.areas[0].centre);
    expect(hilly.areas[0].profile).not.toEqual(flat.areas[0].profile);
    for (const value of Object.values(hilly.areas[0].profile)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('samples the profile within the area relief', () => {
    const volcanic = createGeologicalArea('v', 'volcanic');
    const plan = buildGeologyPlan({ areas: [volcanic] }, random(), 'rectangle');

    expect(plan.areas[0].relief).toBe('mountains');
    expect(plan.areas[0].profile.mountainStrength).toBeGreaterThan(0.5);
  });

  it('plans several stable local reef tendencies for an atoll area', () => {
    const atoll = createGeologicalArea('reef', 'atoll');
    const first = buildGeologyPlan({ areas: [atoll] }, random(), 'rectangle');
    const second = buildGeologyPlan({ areas: [atoll] }, random(), 'rectangle');

    expect(first.areas[0].reefSites.length).toBeGreaterThanOrEqual(3);
    expect(
      new Set(first.areas[0].reefSites.map(site => `${site.centre.x}:${site.centre.y}`)).size
    ).toBe(first.areas[0].reefSites.length);
    expect(second.areas[0].reefSites).toEqual(first.areas[0].reefSites);
    expect(first.areas[0].reefSites.every(site => site.radius > 0)).toBe(true);
  });
});

describe('GeologyPlacementError', () => {
  it('carries structured failures for the offending entries', () => {
    const error = new GeologyPlacementError([
      { areaId: 'area-2', reason: 'no spot' },
      { areaId: 'area-5', reason: 'no spot' },
    ]);

    expect(error.failures).toEqual([
      { id: 'area-2', message: 'no spot' },
      { id: 'area-5', message: 'no spot' },
    ]);
    expect(error.message).toContain('Area "area-2" could not be placed');
  });
});

describe('compareAreaIds', () => {
  it('orders ids by code units, like the plan validation', () => {
    expect(compareAreaIds('area-1', 'area-10')).toBeLessThan(0);
    expect(compareAreaIds('area-10', 'area-2')).toBeLessThan(0);
    expect(compareAreaIds('area-2', 'area-2')).toBe(0);
  });
});
