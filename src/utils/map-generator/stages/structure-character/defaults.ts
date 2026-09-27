import type { StructureCharacterConfig } from '../../types';

/** Character variation (split likelihood) range. */
export const MIN_CHARACTER_VARIATION = 0;
export const MAX_CHARACTER_VARIATION = 1;

/** Terrain bias range: 0 favours plains, 1 favours mountains, 0.5 balanced. */
export const MIN_TERRAIN_BIAS = 0;
export const MAX_TERRAIN_BIAS = 1;
export const BALANCED_TERRAIN_BIAS = 0.5;

/** Longest side (normalized) below which a structure keeps a single character. */
export const ZONE_EXTENT_THRESHOLD = 0.02;

/** Extent at which the size factor behind the split chance reaches its full 1. */
export const FULL_SPLIT_EXTENT = 0.3;

/** Character variation across structures; size and complexity shape the budget. */
export const DEFAULT_STRUCTURE_CHARACTER_CONFIG: StructureCharacterConfig = {
  characterVariation: 0.5,
  terrainBias: BALANCED_TERRAIN_BIAS,
};
