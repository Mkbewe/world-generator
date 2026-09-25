import { PROFILE_NOISE_AMPLITUDE } from './defaults';
import {
  ARCHETYPE_TENDENCIES,
  BASE_PROFILE,
  PROFILE_FIELDS,
  type ProfileField,
} from './tendencies';
import type { SeededRandom } from '../../random/seeded-random';
import type {
  GeologicalStructure,
  StructureCharacterConfig,
  StructureTerrainProfile,
  TerrainProfile,
} from '../../types';

/** Builds one structure profile: archetype tendency, then seeded variation. */
export function buildProfile(
  structure: GeologicalStructure,
  config: StructureCharacterConfig,
  random: SeededRandom
): StructureTerrainProfile {
  const tendency = ARCHETYPE_TENDENCIES[structure.archetype];
  const values: Record<ProfileField, number> = { ...BASE_PROFILE };

  for (const field of PROFILE_FIELDS) {
    const noise = (random.next() * 2 - 1) * config.profileVariation * PROFILE_NOISE_AMPLITUDE;
    values[field] = clamp01(BASE_PROFILE[field] + (tendency[field] ?? 0) + noise);
  }

  return profileFrom(structure.id, values);
}

/** Builds one profile per structure, in the layout order. */
export function buildProfiles(
  structures: readonly GeologicalStructure[],
  config: StructureCharacterConfig,
  random: SeededRandom
): StructureTerrainProfile[] {
  return structures.map(structure => buildProfile(structure, config, random));
}

/** Mutable numeric view of a profile, so a region can override single fields. */
export function profileValues(profile: TerrainProfile): Record<ProfileField, number> {
  const values: Record<ProfileField, number> = {
    elevation: profile.elevation,
    roughness: profile.roughness,
    mountainStrength: profile.mountainStrength,
    hillStrength: profile.hillStrength,
    plateauStrength: profile.plateauStrength,
    lakePotential: profile.lakePotential,
    erosionStrength: profile.erosionStrength,
    coastalCliffStrength: profile.coastalCliffStrength,
  };
  return values;
}

/** Assembles a profile from its numeric values and the owning structure. */
export function profileFrom(
  structureId: string,
  values: Record<ProfileField, number>
): StructureTerrainProfile {
  return { structureId, ...values };
}

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
