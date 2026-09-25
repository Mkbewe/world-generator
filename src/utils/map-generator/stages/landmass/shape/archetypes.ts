import type { ArchetypeRecipe } from './draft';
import type { LandmassArchetype } from '../../../types';

/** Every shape intent the form offers and the generator draws. */
export const LANDMASS_ARCHETYPES = [
  'round',
  'irregular',
  'elongated',
  'branched',
  'lagoon',
] as const;

/**
 * Recipes behind the archetypes. An archetype describes the intent of a shape —
 * how round, blocky, long or closed it should read — while every range is
 * sampled per structure, so seeds never repeat the same outline. Merged
 * intents cover their old neighbours directly: `elongated` spans thin snakes
 * to thick hooks, `lagoon` closes from an open arc into a near-ring.
 */
export const ARCHETYPE_RECIPES: Record<LandmassArchetype, ArchetypeRecipe> = {
  round: {
    corridor: 'sine',
    length: [0.25, 0.4],
    turn: [0, 0.15],
    wobble: [0.1, 0.3],
    bends: [0.5, 1],
    radius: [0.2, 0.3],
    spacing: [0.5, 1.1],
    clampWidth: true,
    size: 1,
    taper: [0.85, 1],
    skew: [-0.15, 0.15],
    variation: [0.15, 0.35],
    branches: [0, 0],
    branchAngle: [0.7, 1.3],
    nodes: [1, 3],
  },
  irregular: {
    corridor: 'angular',
    // Blocky bars, not a smoother blob: straight runs with near-right-angle
    // kinks read as L, U or Z blocks. The width survives the kinks by design.
    length: [0.5, 0.9],
    turn: [1.2, 1.9],
    wobble: [0, 0],
    bends: [3, 5],
    radius: [0.09, 0.14],
    spacing: [1.4, 1.6],
    clampWidth: false,
    size: 1,
    taper: [0.7, 1],
    skew: [-0.2, 0.2],
    variation: [0.25, 0.5],
    branches: [1, 2],
    branchAngle: [1.4, 1.7],
    nodes: [2, 4],
  },
  elongated: {
    corridor: 'sine',
    // Ridges, never bars: every draft curls visibly, the turn component
    // reaches U-shapes and deep single-side hooks while the wobble adds
    // S-variety, and no draft reaches the global extent cap; the range spans
    // thin snakes up to thicker hooks.
    length: [0.6, 1.6],
    turn: [1.2, 3.4],
    wobble: [0.3, 1.4],
    bends: [0.5, 3.5],
    radius: [0.04, 0.11],
    spacing: [1.4, 1.6],
    clampWidth: true,
    size: 1,
    maxExtent: 0.3,
    taper: [0.4, 0.7],
    skew: [-0.3, 0.3],
    variation: [0.25, 0.5],
    branches: [0, 0],
    branchAngle: [0.7, 1.3],
    nodes: [3, 7],
  },
  branched: {
    corridor: 'sine',
    length: [0.9, 1.3],
    turn: [0, 0.8],
    wobble: [0.2, 0.5],
    bends: [0.5, 1],
    radius: [0.09, 0.13],
    spacing: [1.4, 1.6],
    clampWidth: true,
    size: 1,
    taper: [0.45, 0.7],
    skew: [-0.25, 0.25],
    variation: [0.25, 0.5],
    branches: [1, 3],
    branchAngle: [0.7, 1.3],
    nodes: [2, 6],
  },
  lagoon: {
    corridor: 'sine',
    // An open arc that closes into a near-ring at the top of the turn range.
    length: [1, 1.4],
    turn: [4, 6.28],
    wobble: [0.1, 0.4],
    bends: [0.5, 1.2],
    radius: [0.04, 0.07],
    spacing: [1.4, 1.6],
    clampWidth: true,
    size: 0.5,
    taper: [0.5, 0.9],
    skew: [-0.4, 0.4],
    variation: [0.2, 0.4],
    branches: [0, 0],
    branchAngle: [0.7, 1.3],
    nodes: [8, 14],
  },
};

/** Narrows configuration and restored data to a known archetype name. */
export function isLandmassArchetype(value: unknown): value is LandmassArchetype {
  return LANDMASS_ARCHETYPES.some(archetype => archetype === value);
}
