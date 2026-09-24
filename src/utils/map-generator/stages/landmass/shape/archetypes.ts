import type { ArchetypeRecipe } from './draft';
import type { LandmassArchetype } from '../../../types';

/** Every archetype the settings form can enable, in the order it shows them. */
export const LANDMASS_ARCHETYPES = [
  'round',
  'irregular',
  'elongated',
  'winding',
  'branched',
  'lagoon',
  'atoll',
] as const;

/**
 * Recipes behind the archetypes. An archetype describes the intent of a shape —
 * how round, long, winding or closed it should read — while every range is
 * sampled per structure, so seeds never repeat the same outline.
 */
export const ARCHETYPE_RECIPES: Record<LandmassArchetype, ArchetypeRecipe> = {
  round: {
    corridor: 'sine',
    length: [0.4, 0.6],
    turn: [0, 0.3],
    wobble: [0.3, 0.7],
    bends: [0.5, 1],
    radius: [0.2, 0.28],
    taper: [0.6, 0.85],
    skew: [-0.25, 0.25],
    variation: [0.1, 0.3],
    branches: [0, 0],
    nodes: [2, 6],
  },
  irregular: {
    corridor: 'sine',
    length: [0.8, 1.2],
    turn: [0, 1.2],
    wobble: [0.9, 1.6],
    bends: [1.5, 3],
    radius: [0.085, 0.14],
    taper: [0.5, 0.8],
    skew: [-0.35, 0.35],
    variation: [0.25, 0.5],
    branches: [0, 1],
    nodes: [4, 8],
  },
  elongated: {
    corridor: 'sine',
    length: [1.4, 2],
    turn: [0, 0.8],
    wobble: [0.2, 0.5],
    bends: [0.5, 1],
    radius: [0.06, 0.1],
    taper: [0.4, 0.65],
    skew: [-0.2, 0.2],
    variation: [0.1, 0.25],
    branches: [0, 0],
    nodes: [2, 6],
  },
  winding: {
    corridor: 'walk',
    // A random walk of a few bends instead of one sine: `bends` is the piece
    // count, `turn` the per-piece angle and `wobble` the chance of a straight
    // run, so no two windings repeat and some corners are sharp, some shallow.
    length: [1.2, 1.8],
    turn: [0.4, 1.9],
    wobble: [0.1, 0.3],
    bends: [3, 5],
    radius: [0.028, 0.045],
    taper: [0.6, 0.85],
    skew: [0, 0],
    variation: [0, 0],
    branches: [0, 0],
    nodes: [4, 8],
  },
  branched: {
    corridor: 'sine',
    length: [0.9, 1.3],
    turn: [0, 0.8],
    wobble: [0.2, 0.5],
    bends: [0.5, 1],
    radius: [0.09, 0.13],
    taper: [0.45, 0.7],
    skew: [-0.25, 0.25],
    variation: [0.15, 0.3],
    branches: [1, 3],
    nodes: [2, 6],
  },
  lagoon: {
    corridor: 'sine',
    length: [1.1, 1.4],
    turn: [4.2, 5.6],
    wobble: [0.1, 0.3],
    bends: [0.5, 1],
    radius: [0.08, 0.12],
    taper: [0.6, 0.85],
    skew: [-0.2, 0.2],
    variation: [0.1, 0.25],
    branches: [0, 0],
    nodes: [8, 14],
  },
  atoll: {
    corridor: 'ring',
    length: [1.2, 1.6],
    turn: [6.15, 6.28],
    wobble: [0.05, 0.15],
    bends: [0.5, 0.75],
    radius: [0.07, 0.11],
    taper: [0.85, 1],
    skew: [-0.15, 0.15],
    variation: [0.08, 0.2],
    branches: [0, 0],
    nodes: [8, 14],
  },
};

/** Narrows configuration and restored data to a known archetype name. */
export function isLandmassArchetype(value: unknown): value is LandmassArchetype {
  return LANDMASS_ARCHETYPES.some(archetype => archetype === value);
}
