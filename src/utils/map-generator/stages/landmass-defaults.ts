import type { LandmassConfig } from '../types';

/** Maximum number of independently generated structures. */
export const MAX_LANDMASSES = 10;

/** Size range of a structure; 1 is the largest. */
export const MIN_LANDMASS_SIZE = 0.25;
export const MAX_LANDMASS_SIZE = 1;

/** Margin that keeps the generated geometry inside the world shape. */
export const LANDMASS_MARGIN = 0.08;

/** Spines closer than this share one shelf, the archipelago foundation. */
export const LANDMASS_GROUP_DISTANCE = 0.2;

/** Visible layout: two gentle structures sharing a shelf. */
export const DEFAULT_LANDMASS_CONFIG: LandmassConfig = {
  count: 2,
  size: 0.5,
  irregularity: 0.45,
  shelf: { width: 0.07, targetDepth: 0.35, falloff: 0.5, irregularity: 0.35 },
};
