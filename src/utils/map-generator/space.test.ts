import { createWorldSpace, planarDistance, type SampleGrid, spaceOf } from './space';
import type { MapConfig, MapState } from './types';
import type { WorldDimensions } from '../world-dimensions';
import { containsNormalized } from '../world-shape';

const DIMENSIONS: WorldDimensions = {
  widthMeters: 4000,
  heightMeters: 2000,
  sampleWidth: 5,
  sampleHeight: 3,
};

function grid(overrides: Partial<SampleGrid> = {}): SampleGrid {
  return { sampleWidth: 5, sampleHeight: 3, ...overrides };
}

describe('createWorldSpace', () => {
  it('maps every cell centre back to itself', () => {
    const space = createWorldSpace(grid());

    for (let y = 0; y < space.sampleHeight; y++) {
      for (let x = 0; x < space.sampleWidth; x++) {
        expect(space.normalizedToCell(...normalizedTuple(space, x, y))).toEqual({ x, y });
      }
    }
  });

  it('spans the whole 0..1 frame from the first to the last cell', () => {
    const space = createWorldSpace(grid());

    expect(space.cellToNormalized(0, 0)).toEqual({ x: 0, y: 0 });
    expect(space.cellToNormalized(4, 2)).toEqual({ x: 1, y: 1 });
    expect(space.cellToNormalized(2, 1)).toEqual({ x: 0.5, y: 0.5 });
  });

  it('clamps a normalized point outside the frame to the nearest cell', () => {
    const space = createWorldSpace(grid());

    expect(space.normalizedToCell(-1, -1)).toEqual({ x: 0, y: 0 });
    expect(space.normalizedToCell(2, 2)).toEqual({ x: 4, y: 2 });
  });

  it('keeps a single-cell grid at the origin', () => {
    const space = createWorldSpace({ sampleWidth: 1, sampleHeight: 1 });

    expect(space.cellToNormalized(0, 0)).toEqual({ x: 0, y: 0 });
    expect(space.normalizedToCell(0.4, 0.6)).toEqual({ x: 0, y: 0 });
  });

  it('maps the mask frame so cell containment agrees with containsNormalized', () => {
    const space = createWorldSpace(grid());

    for (let y = 0; y < space.sampleHeight; y++) {
      for (let x = 0; x < space.sampleWidth; x++) {
        const normalized = space.cellToNormalized(x, y);
        const mask = space.cellToMask(x, y);

        expect(containsNormalized('disc', normalized)).toBe(mask.x * mask.x + mask.y * mask.y <= 1);
        expect(containsNormalized('rectangle', normalized)).toBe(
          Math.abs(mask.x) <= 1 && Math.abs(mask.y) <= 1
        );
      }
    }
  });

  it('delegates the canonical distance to planarDistance', () => {
    const space = createWorldSpace(grid());
    const left = { x: 0.2, y: 0.3 };
    const right = { x: 0.7, y: 0.9 };

    expect(space.distance(left, right)).toBe(planarDistance(left, right));
  });

  it('scales each axis by its own physical size', () => {
    const space = createWorldSpace(grid({ ...DIMENSIONS }));

    expect(space.distanceMeters({ x: 0, y: 0 }, { x: 0.25, y: 0 })).toBeCloseTo(1000);
    expect(space.distanceMeters({ x: 0, y: 0 }, { x: 0, y: 0.25 })).toBeCloseTo(500);
    expect(space.distanceMeters({ x: 0.1, y: 0.1 }, { x: 0.1, y: 0.1 })).toBe(0);
  });

  it('treats one sample step as one unit when the physical size is missing', () => {
    const space = createWorldSpace(grid());

    expect(space.distanceMeters({ x: 0, y: 0 }, { x: 0.25, y: 0 })).toBeCloseTo(1.25);
  });
});

describe('spaceOf', () => {
  const config: MapConfig = { world: { dimensions: DIMENSIONS, seed: 1, shape: 'disc' } };
  const state: MapState = {};

  it('uses the run space when the context carries one', () => {
    const space = createWorldSpace(grid());

    expect(spaceOf({ config, state, space })).toBe(space);
  });

  it('derives the space from the world dimensions when missing', () => {
    const space = spaceOf({ config, state });

    expect(space.sampleWidth).toBe(DIMENSIONS.sampleWidth);
    expect(space.sampleHeight).toBe(DIMENSIONS.sampleHeight);
    expect(space.cellToNormalized(0, 0)).toEqual({ x: 0, y: 0 });
  });
});

function normalizedTuple(
  space: ReturnType<typeof createWorldSpace>,
  x: number,
  y: number
): readonly [number, number] {
  const point = space.cellToNormalized(x, y);
  return [point.x, point.y];
}
