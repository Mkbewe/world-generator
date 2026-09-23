import type { LandmassArchetype, LandmassEdge, LandmassNode } from '../../types';

/** Value range `[min, max]` sampled once per structure. */
export type ArchetypeRange = readonly [min: number, max: number];

/**
 * Parameter ranges of one shape intent. The generator samples every range, so
 * two structures of the same archetype still differ in size, bend and detail.
 */
export interface ArchetypeRecipe {
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
}

/** One generated structure before the size budget scales and places it. */
export interface StructureDraft {
  readonly id: string;
  readonly archetype: LandmassArchetype;
  readonly nodes: readonly LandmassNode[];
  readonly edges: readonly LandmassEdge[];
  /** Approximate footprint area of the unit geometry. */
  readonly area: number;
}
