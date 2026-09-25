import type { LandmassArchetype, TerrainProfile } from '../../types';

/** The eight numeric profile fields. */
export type ProfileField = keyof TerrainProfile;

/** Fixed field order: seeded variation is drawn in this order, one value each. */
export const PROFILE_FIELDS: readonly ProfileField[] = [
  'elevation',
  'roughness',
  'mountainStrength',
  'hillStrength',
  'plateauStrength',
  'lakePotential',
  'erosionStrength',
  'coastalCliffStrength',
];

/** Neutral profile every structure starts from before its tendency. */
export const BASE_PROFILE: Readonly<Record<ProfileField, number>> = {
  elevation: 0.5,
  roughness: 0.5,
  mountainStrength: 0.5,
  hillStrength: 0.5,
  plateauStrength: 0.5,
  lakePotential: 0.5,
  erosionStrength: 0.5,
  coastalCliffStrength: 0.5,
};

/**
 * Behaviour of the archetypes as data: the terrain each shape intent leans
 * towards. The generator adds these offsets and then the seeded variation, so
 * no code branches on an archetype name. A missing field keeps the base value.
 */
export const ARCHETYPE_TENDENCIES: Readonly<
  Record<LandmassArchetype, Partial<Record<ProfileField, number>>>
> = {
  round: { hillStrength: 0.15, mountainStrength: -0.15, coastalCliffStrength: -0.1 },
  irregular: {
    roughness: 0.2,
    mountainStrength: 0.15,
    erosionStrength: 0.1,
    coastalCliffStrength: 0.1,
  },
  elongated: { mountainStrength: 0.25, erosionStrength: 0.2, lakePotential: -0.15 },
  branched: { mountainStrength: 0.2, roughness: 0.15, erosionStrength: 0.15 },
  lagoon: {
    lakePotential: 0.35,
    coastalCliffStrength: 0.15,
    elevation: -0.1,
    mountainStrength: -0.2,
  },
};
