import { TERRAIN_CHARACTERS, type TerrainCharacter, type TerrainProfile } from './types';

/** Inclusive [min, max] sampling range for one terrain field. */
export type FieldRange = readonly [min: number, max: number];

/**
 * Sampling ranges for all terrain fields of one character. A profile draws a
 * value uniformly within each range; secondary features are included so the
 * heightmap never sees incompatible combinations (e.g. lakes in mountains).
 */
export interface CharacterRanges {
  // Primary — determines the landform type.
  readonly elevation: FieldRange;
  readonly roughness: FieldRange;
  readonly mountainStrength: FieldRange;
  readonly hillStrength: FieldRange;
  readonly plateauStrength: FieldRange;
  // Secondary — derived from the primary character.
  readonly lakePotential: FieldRange;
  readonly erosionStrength: FieldRange;
  readonly coastalCliffStrength: FieldRange;
}

/** Sampling ranges keyed by primary terrain character. */
export const CHARACTER_RANGES: Readonly<Record<TerrainCharacter, CharacterRanges>> = {
  plains: {
    elevation: [0.4, 0.6],
    roughness: [0.1, 0.3],
    mountainStrength: [0.0, 0.1],
    hillStrength: [0.0, 0.2],
    plateauStrength: [0.0, 0.15],
    lakePotential: [0.3, 0.8],
    erosionStrength: [0.1, 0.3],
    coastalCliffStrength: [0.0, 0.2],
  },
  hills: {
    elevation: [0.45, 0.65],
    roughness: [0.3, 0.5],
    mountainStrength: [0.0, 0.2],
    hillStrength: [0.5, 0.9],
    plateauStrength: [0.0, 0.2],
    lakePotential: [0.1, 0.4],
    erosionStrength: [0.2, 0.5],
    coastalCliffStrength: [0.0, 0.3],
  },
  mountains: {
    elevation: [0.6, 0.9],
    roughness: [0.6, 1.0],
    mountainStrength: [0.7, 1.0],
    hillStrength: [0.0, 0.3],
    plateauStrength: [0.0, 0.15],
    lakePotential: [0.0, 0.1],
    erosionStrength: [0.3, 0.7],
    coastalCliffStrength: [0.2, 0.6],
  },
};

/** Samples a single value uniformly within the given range using a 0..1 roll. */
export function sampleRange([min, max]: FieldRange, roll: number): number {
  return min + roll * (max - min);
}

/** Whether unknown data is a primary terrain character. */
export function isTerrainCharacter(value: unknown): value is TerrainCharacter {
  return typeof value === 'string' && (TERRAIN_CHARACTERS as readonly string[]).includes(value);
}

/** The eight fields every terrain profile must carry, in a fixed order. */
const PROFILE_FIELDS = [
  'elevation',
  'roughness',
  'mountainStrength',
  'hillStrength',
  'plateauStrength',
  'lakePotential',
  'erosionStrength',
  'coastalCliffStrength',
] as const;

/** Whether unknown data is a terrain profile with normalized values. */
export function isTerrainProfile(value: unknown): value is TerrainProfile {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return PROFILE_FIELDS.every(field => isNormalized(record[field]));
}

function isNormalized(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}
