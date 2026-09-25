import type { LandmassArchetype, LandmassEdge, LandmassNode } from '../../../types';

/** Value range `[min, max]` sampled once per structure. */
export type ArchetypeRange = readonly [min: number, max: number];

/**
 * How a recipe turns its ranges into a corridor: `sine` integrates one total
 * turn with an oscillation, `angular` joins straight runs with discrete
 * kinks. The recipe selects the builder — never the archetype name — so a
 * new shape is a new recipe row, not an engine edit.
 */
export type CorridorKind = 'sine' | 'angular';

/**
 * Parameter ranges of one shape intent. The generator samples every range, so
 * two structures of the same archetype still differ in size, bend and detail.
 * Each builder reads the shared fields in its own way: `bends` counts sine
 * half-waves for `sine` but pieces for `angular`; `turn` is a total change
 * for `sine` and a per-joint kink for `angular`; `wobble` is an oscillation
 * amplitude for `sine` that the `angular` builder ignores.
 */
export interface ArchetypeRecipe {
  /** Corridor builder behind this recipe. */
  readonly corridor: CorridorKind;
  /** Corridor arc length in unit geometry. */
  readonly length: ArchetypeRange;
  /** Total direction change along the corridor, in radians; the sign is random. */
  readonly turn: ArchetypeRange;
  /** Direction oscillation amplitude, in radians. */
  readonly wobble: ArchetypeRange;
  /** Number of direction oscillation half-waves along the corridor. */
  readonly bends: ArchetypeRange;
  /** Base influence radius in unit geometry. */
  readonly radius: ArchetypeRange;
  /**
   * Whether the corridor narrows to fit its tightest turn. Smooth builders
   * need it so the outline never folds; `angular` keeps its full width at
   * the discrete kinks, where the miter is the intended shape.
   */
  readonly clampWidth: boolean;
  /**
   * Multiplier of the planned typical extent: 1 keeps the standard island
   * size, lower values mark intents that read small by design, like a lagoon.
   */
  readonly size: number;
  /**
   * Hard cap of the longest side as a fraction of the world, for intents
   * that must never reach the global cap (a giant elongated bar). Absent
   * means the global cap applies.
   */
  readonly maxExtent?: number;
  /** Node spacing along the corridor, as a multiple of the local radius. */
  readonly spacing: ArchetypeRange;
  /** Node count of the main corridor; the archetype intent decides the range. */
  readonly nodes: ArchetypeRange;
  /** End taper: 1 keeps the full radius at the tips, lower values pinch them. */
  readonly taper: ArchetypeRange;
  /** How much thicker one end is than the other, as a fraction of the radius. */
  readonly skew: ArchetypeRange;
  /** Smooth radius variation along the corridor, as a fraction of the radius. */
  readonly variation: ArchetypeRange;
  /** Number of branch corridors grown from interior nodes. */
  readonly branches: ArchetypeRange;
  /**
   * Deflection of a branch from its parent corridor, in radians: ~0.7 keeps
   * arms alongside the body, ~1.6 sticks them out at a right angle.
   */
  readonly branchAngle: ArchetypeRange;
}

/** One generated structure before the size plan scales and places it. */
export interface StructureDraft {
  readonly id: string;
  readonly archetype: LandmassArchetype;
  readonly nodes: readonly LandmassNode[];
  readonly edges: readonly LandmassEdge[];
}

/** Geometry placement may move; the rest of a structure passes through. */
export interface PlaceableStructure {
  readonly nodes: readonly LandmassNode[];
  readonly edges: readonly LandmassEdge[];
}
