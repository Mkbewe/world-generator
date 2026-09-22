import type { LandmassArchetype } from '../types';

/** Every archetype the layout can draw, in the order the settings form shows them. */
export const LANDMASS_ARCHETYPES = [
  'round',
  'oval',
  'elongated',
  'l',
  'u',
  's',
  'z',
  'y',
  'x',
  't',
] as const;

/** Value range `[min, max]` sampled once per structure. */
export type ArchetypeRange = readonly [min: number, max: number];

/** Elongated shape attached to the spine, e.g. a crossbar that branches off it. */
export interface ArchetypeBar {
  /** Position along the spine, 0 at its start and 1 at its end. */
  readonly at: ArchetypeRange;
  /** Rotation relative to the spine direction at that position, in radians. */
  readonly angle: ArchetypeRange;
  /** Half-length, as a fraction of the structure scale. */
  readonly length: ArchetypeRange;
  /** Half-width, as a fraction of the structure scale. */
  readonly width: ArchetypeRange;
  /** Offset along the bar's axis, as a fraction of its half-length. */
  readonly bias: ArchetypeRange;
}

export interface ArchetypeRecipe {
  /** Joint turns in travel order, in radians; the sign fixes the bend direction. */
  readonly joints: readonly ArchetypeRange[];
  /** Segment lengths in travel order, as fractions of the structure scale. */
  readonly segments: readonly ArchetypeRange[];
  /** Base half-width, as a fraction of the structure scale. */
  readonly width: ArchetypeRange;
  /** End taper: 1 keeps the full width at the tips, lower values pinch them. */
  readonly taper: ArchetypeRange;
  /** Shapes branching off the spine, for archetypes a polyline cannot draw alone. */
  readonly bars?: readonly ArchetypeBar[];
}

/**
 * Recipes behind the archetypes. Every value is a range sampled once per
 * structure, so two structures of the same archetype still differ in opening
 * angles, arm lengths, width and orientation.
 */
export const ARCHETYPE_RECIPES: Record<LandmassArchetype, ArchetypeRecipe> = {
  round: {
    joints: [],
    segments: [[0.02, 0.06]],
    width: [0.1, 0.16],
    taper: [0.85, 1],
  },
  oval: {
    joints: [],
    segments: [[0.08, 0.14]],
    width: [0.065, 0.09],
    taper: [0.85, 1],
  },
  elongated: {
    joints: [[-0.35, 0.35]],
    segments: [
      [0.1, 0.18],
      [0.1, 0.18],
    ],
    width: [0.03, 0.05],
    taper: [0.3, 0.5],
  },
  l: {
    joints: [[1.05, 2.09]],
    segments: [
      [0.11, 0.18],
      [0.09, 0.16],
    ],
    width: [0.028, 0.045],
    taper: [0.55, 0.75],
  },
  u: {
    joints: [
      [0.64, 0.88],
      [0.64, 0.88],
      [0.64, 0.88],
      [0.64, 0.88],
    ],
    segments: [
      [0.08, 0.13],
      [0.045, 0.07],
      [0.045, 0.07],
      [0.045, 0.07],
      [0.08, 0.13],
    ],
    width: [0.025, 0.04],
    taper: [0.55, 0.75],
  },
  s: {
    joints: [
      [0.45, 0.8],
      [0.45, 0.8],
      [-0.8, -0.45],
      [-0.8, -0.45],
    ],
    segments: [
      [0.07, 0.11],
      [0.05, 0.08],
      [0.05, 0.08],
      [0.05, 0.08],
      [0.07, 0.11],
    ],
    width: [0.028, 0.045],
    taper: [0.5, 0.7],
  },
  z: {
    joints: [
      [0.9, 1.5],
      [-1.5, -0.9],
    ],
    segments: [
      [0.1, 0.16],
      [0.1, 0.16],
      [0.1, 0.16],
    ],
    width: [0.028, 0.045],
    taper: [0.5, 0.7],
  },
  y: {
    joints: [[1.8, 2.3]],
    segments: [
      [0.08, 0.13],
      [0.08, 0.13],
    ],
    width: [0.025, 0.04],
    taper: [0.5, 0.7],
    bars: [
      {
        at: [0.5, 0.5],
        angle: [-2.3, -1.8],
        length: [0.05, 0.07],
        width: [0.014, 0.023],
        bias: [0.8, 0.95],
      },
    ],
  },
  x: {
    joints: [],
    segments: [[0.14, 0.19]],
    width: [0.022, 0.035],
    taper: [0.7, 0.85],
    bars: [
      {
        at: [0.35, 0.65],
        angle: [1.15, 1.95],
        length: [0.1, 0.14],
        width: [0.014, 0.022],
        bias: [-0.25, 0.25],
      },
    ],
  },
  t: {
    joints: [],
    segments: [[0.14, 0.2]],
    width: [0.025, 0.04],
    taper: [0.75, 0.9],
    bars: [
      {
        at: [0.82, 0.98],
        angle: [1.2, 1.9],
        length: [0.1, 0.14],
        width: [0.015, 0.023],
        bias: [-0.25, 0.25],
      },
    ],
  },
};

/** Narrows configuration and restored data to a known archetype name. */
export function isLandmassArchetype(value: unknown): value is LandmassArchetype {
  return LANDMASS_ARCHETYPES.some(archetype => archetype === value);
}
