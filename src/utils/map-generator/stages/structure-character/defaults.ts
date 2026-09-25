import type { StructureCharacterConfig } from '../../types';

/** Spread of the per-structure profile; 0 makes every structure of a kind equal. */
export const MIN_PROFILE_VARIATION = 0;
export const MAX_PROFILE_VARIATION = 1;

/** Density of regional overrides on large structures; 0 grows none. */
export const MIN_REGION_DENSITY = 0;
export const MAX_REGION_DENSITY = 1;

/** Amplitude of the per-structure profile noise at full variation. */
export const PROFILE_NOISE_AMPLITUDE = 0.35;

/** Largest absolute override a region applies to a profile field. */
export const REGION_OVERRIDE_AMPLITUDE = 0.3;

/** Longest side (normalized) below which a structure stays uniform. */
export const REGION_EXTENT_THRESHOLD = 0.25;

/** Regions per unit of extent at full `regionDensity`; the count is capped below. */
export const REGION_DENSITY = 6;

/** Hard cap of regional overrides on one structure. */
export const MAX_REGIONS_PER_STRUCTURE = 3;

/** Base share of the extent used as a region influence radius. */
export const REGION_RADIUS_BASE = 0.4;

/** Extra influence radius drawn per region, scaled by the extent. */
export const REGION_RADIUS_SPREAD = 0.3;

/** A spread of clearly different structures with some regional detail. */
export const DEFAULT_STRUCTURE_CHARACTER_CONFIG: StructureCharacterConfig = {
  profileVariation: 0.5,
  regionDensity: 0.5,
};
