import type { LandmassConfig } from '../../types';

/** Maximum number of independently generated structures. */
export const MAX_LANDMASSES = 20;

/** Typical island size on a small-to-large scale; 0 is tiny, 1 is huge. */
export const MIN_LANDMASS_SIZE = 0;
export const MAX_LANDMASS_SIZE = 1;

/** How strongly the structure sizes may differ; 0 keeps them nearly equal. */
export const MIN_LANDMASS_DIVERSITY = 0;
export const MAX_LANDMASS_DIVERSITY = 1;

/** Margin that keeps the generated geometry inside the world shape. */
export const LANDMASS_MARGIN = 0.08;

/** Spines closer than this share one shelf, the archipelago foundation. */
export const LANDMASS_GROUP_DISTANCE = 0.2;

/** Free space kept between two structure outlines, in normalized units. */
export const STRUCTURE_GAP = 0.02;

/**
 * Ocean kept between an island and the world edge, in meters. Placement
 * measures the inside share against the shape eroded by this margin, so an
 * island may reach past it but is cut with water to spare. Capped at a share
 * of the smaller world side, so toy worlds still place something.
 */
export const OCEAN_MARGIN_METERS = 25;

/** Largest margin as a share of the smaller world side. */
export const MAX_MARGIN_SHARE = 0.1;

/** Visible layout: ten mid-scale structures, clearly different sizes. */
export const DEFAULT_LANDMASS_CONFIG: LandmassConfig = {
  count: 10,
  size: 0.5,
  diversity: 0.5,
  shelf: { width: 0.07, targetDepth: 0.35, falloff: 0.5, irregularity: 0.35 },
};
