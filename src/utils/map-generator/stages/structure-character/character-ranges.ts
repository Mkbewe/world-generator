import { CHARACTER_RANGES, type CharacterRanges } from '../../terrain-profile';

export type { CharacterRanges, FieldRange } from '../../terrain-profile';
export { CHARACTER_RANGES, sampleRange } from '../../terrain-profile';

/**
 * Variant ranges used when the owning structure has the `lagoon` archetype.
 * The character is always `plains`, but secondary features are suppressed —
 * a lagoon is a clean, flat lowland without lakes, cliffs or heavy erosion.
 */
export const LAGOON_RANGES: CharacterRanges = {
  ...CHARACTER_RANGES.plains,
  lakePotential: [0.0, 0.05],
  coastalCliffStrength: [0.0, 0.05],
  erosionStrength: [0.05, 0.15],
};
