import type { GeologyPlan } from '@generator/types';

import { deriveGeologyPlan, planBorderDistances } from './geology-plan-derived';

function plan(overrides: Partial<GeologyPlan> = {}): GeologyPlan {
  return {
    regions: [
      {
        id: 'region-1',
        centre: { x: 0.25, y: 0.5 },
        thermal: 'temperate',
        weight: 1,
        type: 'ordinary',
        areaSquareMeters: 300,
      },
      {
        id: 'region-2',
        centre: { x: 0.75, y: 0.5 },
        thermal: 'temperate',
        weight: 1,
        type: 'volcanic',
        areaSquareMeters: 200,
      },
    ],
    regionRasterSize: { width: 5, height: 1 },
    regionOwnerMap: new Int16Array([0, 0, 0, 1, 1]),
    regionBorderDistanceMap: new Float32Array([20, 10, 0, 0, 10]),
    worldAreaSquareMeters: 500,
    ...overrides,
  };
}

describe('planBorderDistances', () => {
  it('converts the plan metres to the same cell distances the painter used before', () => {
    expect([...planBorderDistances(plan())]).toEqual([2.5, 1.5, 0.5, 0.5, 1.5]);
  });

  it('keeps cells outside the owned area far from every border', () => {
    const distances = planBorderDistances(
      plan({
        regionRasterSize: { width: 3, height: 1 },
        regionOwnerMap: new Int16Array([0, -1, 0]),
        regionBorderDistanceMap: new Float32Array([0, 0, 0]),
        worldAreaSquareMeters: 200,
      })
    );

    expect([...distances]).toEqual([0.5, 4, 0.5]);
  });

  it('rejects a plan without owned cells', () => {
    expect(() =>
      planBorderDistances(
        plan({
          regionOwnerMap: new Int16Array([-1, -1, -1, -1, -1]),
          worldAreaSquareMeters: 0,
        })
      )
    ).toThrow(RangeError);
  });
});

describe('deriveGeologyPlan', () => {
  it('composes the existing derived blocks without recomputing borders', async () => {
    const derived = await deriveGeologyPlan(
      plan(),
      { width: 5, height: 1 },
      new AbortController().signal
    );

    expect([...derived.extendedOwners]).toEqual([0, 0, 0, 1, 1]);
    expect([...derived.distances]).toEqual([2.5, 1.5, 0.5, 0.5, 1.5]);
    expect(derived.borders.length).toBeGreaterThan(0);
    expect(derived.centres[0]).toBeDefined();
    expect(derived.centres[1]).toBeDefined();
  });

  it('stops before deriving when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      deriveGeologyPlan(plan(), { width: 5, height: 1 }, controller.signal)
    ).rejects.toThrow();
  });
});
