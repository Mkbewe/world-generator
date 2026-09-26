import type { StructureCharacterConfig } from '../../types';

/** Character variation (split likelihood) range. */
export const MIN_CHARACTER_VARIATION = 0;
export const MAX_CHARACTER_VARIATION = 1;

/** Longest side (normalized) below which a structure keeps a single character. */
export const ZONE_EXTENT_THRESHOLD = 0.02;

/** Smallest and largest core fraction of a `center` zone. */
export const MIN_CENTER_FRACTION = 0.25;
export const MAX_CENTER_FRACTION = 0.6;

/** Character variation across structures with occasional splits on large ones. */
export const DEFAULT_STRUCTURE_CHARACTER_CONFIG: StructureCharacterConfig = {
  characterVariation: 0.5,
};
