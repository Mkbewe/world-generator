import { createLandmassSampler } from './landmass-sampler';
import type { LandmassDefinition, LandShape } from '../types';

function landmass(overrides: Partial<LandmassDefinition> = {}): LandmassDefinition {
  return {
    id: 'landmass-1',
    spine: [
      { x: 0.3, y: 0.5 },
      { x: 0.7, y: 0.5 },
    ],
    widthProfile: [0.05, 0.05],
    orientation: 0,
    irregularity: 0,
    positiveShapes: [],
    negativeShapes: [],
    shelfId: 'shelf-1',
    ...overrides,
  };
}

function shape(overrides: Partial<LandShape> = {}): LandShape {
  return {
    id: 'shape-1',
    center: { x: 0.5, y: 0.58 },
    halfLength: 0.05,
    halfWidth: 0.04,
    orientation: 0,
    irregularity: 0,
    ...overrides,
  };
}

describe('createLandmassSampler', () => {
  it('classifies points by the spine capsule of the width profile', () => {
    const landmassAt = createLandmassSampler([landmass()]);

    expect(landmassAt(0.5, 0.5)).toBe(1);
    expect(landmassAt(0.5, 0.53)).toBe(1);
    expect(landmassAt(0.5, 0.56)).toBe(0);
    expect(landmassAt(0.2, 0.5)).toBe(0);
  });

  it('follows the tapered width along the spine', () => {
    const landmassAt = createLandmassSampler([landmass({ widthProfile: [0.1, 0.02] })]);

    expect(landmassAt(0.3, 0.57)).toBe(1);
    expect(landmassAt(0.7, 0.57)).toBe(0);
  });

  it('adds land from positive shapes and cuts it with negative shapes', () => {
    const added = createLandmassSampler([landmass({ positiveShapes: [shape()] })]);
    const cut = createLandmassSampler([landmass({ negativeShapes: [shape()] })]);

    expect(added(0.5, 0.58)).toBe(1);
    expect(added(0.5, 0.61)).toBe(1);
    expect(cut(0.5, 0.58)).toBe(0);
    expect(cut(0.5, 0.5)).toBe(1);
  });

  it('assigns every point to the structure with the closest outline', () => {
    const first = landmass({
      id: 'landmass-1',
      spine: [
        { x: 0.4, y: 0.5 },
        { x: 0.4, y: 0.6 },
      ],
      widthProfile: [0.1, 0.1],
    });
    const second = landmass({
      id: 'landmass-2',
      spine: [
        { x: 0.6, y: 0.5 },
        { x: 0.6, y: 0.6 },
      ],
      widthProfile: [0.1, 0.1],
    });
    const landmassAt = createLandmassSampler([first, second]);

    expect(landmassAt(0.41, 0.55)).toBe(1);
    expect(landmassAt(0.59, 0.55)).toBe(2);
    expect(landmassAt(0.52, 0.55)).toBe(2);
  });

  it('treats shape outlines as exact ellipses, whatever their irregularity', () => {
    const landmassAt = createLandmassSampler([
      landmass({ positiveShapes: [shape({ irregularity: 0.6 })] }),
    ]);

    // halfLength 0.05 and halfWidth 0.04 around the centre (0.5, 0.58).
    expect(landmassAt(0.5, 0.58 + 0.039)).toBe(1);
    expect(landmassAt(0.5, 0.58 + 0.041)).toBe(0);
    expect(landmassAt(0.5 + 0.049, 0.58)).toBe(1);
    expect(landmassAt(0.5 + 0.051, 0.58)).toBe(0);
  });

  it('returns zero without structures', () => {
    expect(createLandmassSampler([])(0.5, 0.5)).toBe(0);
  });
});
