import type { LandmassArchetype } from '../types';

/** Every archetype the layout can draw, in the order the settings form shows them. */
export const LANDMASS_ARCHETYPES = [
  'round',
  'oval',
  'elongated',
  'irregular',
  'o',
  'c',
  'l',
  'u',
  's',
  'z',
  'v',
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
  /**
   * Rotation relative to the spine direction in radians, or `bisector` for a
   * stem that leaves a corner opposite its arms, computed from the geometry.
   */
  readonly angle: ArchetypeRange | 'bisector';
  /** Half-length, as a multiple of the spine's half-width. */
  readonly length: ArchetypeRange;
  /** Half-width, as a multiple of the spine's half-width. */
  readonly width: ArchetypeRange;
  /** Offset along the bar's axis, as a fraction of its half-length. */
  readonly bias: ArchetypeRange;
}

/** Arc spine of a ring-shaped structure, swept around an ellipse. */
export interface ArchetypeArc {
  /** Sweep angle in radians; a full turn closes the ring into an atoll. */
  readonly sweep: ArchetypeRange;
  /** Radius of the ring, as a fraction of the structure scale. */
  readonly radius: ArchetypeRange;
  /** Across-radius as a fraction of the along-radius; below one flattens it. */
  readonly flatten: ArchetypeRange;
  /** Straight joints leaving the two arc ends, so each tip bends its own way. */
  readonly tips?: {
    /** Extra turn at each end in travel order, sampled independently. */
    readonly turns: readonly [ArchetypeRange, ArchetypeRange];
    /** Length of each tip, as a fraction of the ring radius. */
    readonly length: ArchetypeRange;
  };
}

/** Fields every recipe shares, whatever shape its spine has. */
interface ArchetypeRecipeBase {
  /** Base half-width, as a fraction of the structure scale. */
  readonly width: ArchetypeRange;
  /** End taper: 1 keeps the full width at the tips, lower values pinch them. */
  readonly taper: ArchetypeRange;
  /**
   * Multiplier of the local half-width sampled per spine point; above one makes
   * the outline wavy with thicker and thinner stretches. Defaults to a smooth
   * profile.
   */
  readonly widthJitter?: ArchetypeRange;
  /**
   * How much thicker one end is than the other, as a fraction of the base
   * half-width; the middle of the spine keeps the base width. Defaults to a
   * symmetric profile.
   */
  readonly widthSkew?: ArchetypeRange;
  /** Multiplier of the attached shapes' length and width; defaults to one. */
  readonly shapeScale?: ArchetypeRange;
  /** Shapes branching off the spine, for archetypes a polyline cannot draw alone. */
  readonly bars?: readonly ArchetypeBar[];
  /** How many peninsulas and bays the structure grows; defaults to one to two. */
  readonly shapes?: {
    readonly positive: ArchetypeRange;
    readonly negative: ArchetypeRange;
  };
}

/** One tangent-continuous circular arc of a smooth, serpentine spine. */
export interface ArchetypeArcSegment {
  /** Sweep angle in radians; the sign fixes which way this arc bends. */
  readonly sweep: ArchetypeRange;
  /** Radius of the arc, as a fraction of the structure scale. */
  readonly radius: ArchetypeRange;
}

/** Recipe whose spine is a bent polyline, e.g. an L or an oblong blob. */
export interface ArchetypePolylineRecipe extends ArchetypeRecipeBase {
  /** Joint turns in travel order, in radians; the sign fixes the bend direction. */
  readonly joints: readonly ArchetypeRange[];
  /** Segment lengths in travel order, as fractions of the structure scale. */
  readonly segments: readonly ArchetypeRange[];
}

/** Recipe whose spine sweeps around an ellipse, e.g. an atoll or a C. */
export interface ArchetypeArcRecipe extends ArchetypeRecipeBase {
  readonly arc: ArchetypeArc;
}

/** Recipe whose spine chains circular arcs, e.g. a smoothly curled S. */
export interface ArchetypeArcsRecipe extends ArchetypeRecipeBase {
  /** Arcs in travel order; every arc starts tangent to the previous one. */
  readonly arcs: readonly ArchetypeArcSegment[];
}

export type ArchetypeRecipe = ArchetypePolylineRecipe | ArchetypeArcRecipe | ArchetypeArcsRecipe;

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
    joints: [
      [-0.7, 0.7],
      [-0.7, 0.7],
    ],
    segments: [
      [0.03, 0.06],
      [0.03, 0.06],
      [0.03, 0.06],
    ],
    width: [0.06, 0.085],
    taper: [0.75, 0.9],
  },
  elongated: {
    joints: [
      [-0.8, 0.8],
      [-0.8, 0.8],
    ],
    segments: [
      [0.07, 0.13],
      [0.07, 0.13],
      [0.07, 0.13],
    ],
    width: [0.045, 0.07],
    taper: [0.5, 0.7],
  },
  l: {
    joints: [[0.45, 1.35]],
    segments: [
      [0.14, 0.2],
      [0.045, 0.08],
    ],
    width: [0.04, 0.07],
    taper: [0.55, 0.75],
  },
  u: {
    joints: [
      [0.55, 0.8],
      [0.64, 0.88],
      [0.64, 0.88],
      [0.7, 0.95],
    ],
    segments: [
      [0.045, 0.075],
      [0.045, 0.07],
      [0.045, 0.07],
      [0.045, 0.07],
      [0.12, 0.17],
    ],
    width: [0.038, 0.055],
    taper: [0.55, 0.75],
    widthSkew: [-0.4, 0.4],
  },
  s: {
    arcs: [
      { sweep: [2, 2.5], radius: [0.065, 0.09] },
      { sweep: [-2.5, -2], radius: [0.065, 0.09] },
    ],
    width: [0.036, 0.052],
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
    width: [0.042, 0.062],
    taper: [0.5, 0.7],
  },
  v: {
    joints: [[2, 2.7]],
    segments: [
      [0.13, 0.19],
      [0.13, 0.19],
    ],
    width: [0.026, 0.04],
    taper: [0.35, 0.55],
  },
  y: {
    joints: [[1.8, 2.3]],
    segments: [
      [0.08, 0.13],
      [0.08, 0.13],
    ],
    width: [0.042, 0.062],
    taper: [0.5, 0.7],
    bars: [
      {
        at: [0.5, 0.5],
        angle: 'bisector',
        length: [1.4, 2.1],
        width: [0.75, 1],
        bias: [0.8, 0.95],
      },
    ],
  },
  x: {
    joints: [],
    segments: [[0.14, 0.19]],
    width: [0.04, 0.058],
    taper: [0.7, 0.85],
    bars: [
      {
        at: [0.35, 0.65],
        angle: [1.15, 1.95],
        length: [2.6, 4],
        width: [0.5, 0.8],
        bias: [-0.25, 0.25],
      },
    ],
  },
  irregular: {
    joints: [
      [-1.3, 1.3],
      [-1.3, 1.3],
      [-1.3, 1.3],
      [-1.3, 1.3],
      [-1.3, 1.3],
      [-1.3, 1.3],
    ],
    segments: [
      [0.03, 0.06],
      [0.03, 0.06],
      [0.03, 0.06],
      [0.03, 0.06],
      [0.03, 0.06],
      [0.03, 0.06],
      [0.03, 0.06],
    ],
    width: [0.05, 0.08],
    taper: [0.6, 0.85],
    widthJitter: [0.6, 1.5],
    shapeScale: [1.1, 1.6],
    shapes: { positive: [2, 4], negative: [2, 4] },
  },
  o: {
    arc: {
      sweep: [Math.PI * 2, Math.PI * 2],
      radius: [0.105, 0.145],
      flatten: [0.72, 1],
    },
    width: [0.03, 0.044],
    taper: [1, 1],
    // A single peninsula cannot bridge the lagoon; bays only notch the band.
    shapes: { positive: [1, 1], negative: [0, 1] },
  },
  c: {
    arc: {
      sweep: [4, 5.3],
      radius: [0.1, 0.145],
      flatten: [0.72, 1],
      tips: {
        turns: [
          [-0.9, 0.9],
          [-0.9, 0.9],
        ],
        length: [0.25, 0.5],
      },
    },
    width: [0.032, 0.048],
    taper: [0.55, 0.8],
  },
  t: {
    joints: [],
    segments: [[0.15, 0.21]],
    width: [0.038, 0.055],
    taper: [0.7, 0.85],
    bars: [
      {
        at: [0.8, 0.95],
        angle: [1.2, 1.9],
        length: [1.6, 2.4],
        width: [0.7, 0.95],
        bias: [-0.2, 0.2],
      },
    ],
  },
};

/** Narrows configuration and restored data to a known archetype name. */
export function isLandmassArchetype(value: unknown): value is LandmassArchetype {
  return LANDMASS_ARCHETYPES.some(archetype => archetype === value);
}
