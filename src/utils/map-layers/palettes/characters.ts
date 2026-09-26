import type { TerrainCharacter } from '../../map-generator/types';
import type { Color } from '../catalog/layer-spec';

export interface CharacterStyle {
  readonly label: string;
  readonly color: Color;
}

/** Colour and label of every primary terrain character. */
export const CHARACTER_STYLES: Readonly<Record<TerrainCharacter, CharacterStyle>> = {
  plains: { label: 'Plains', color: [204, 204, 145] },
  hills: { label: 'Hills', color: [124, 168, 96] },
  mountains: { label: 'Mountains', color: [146, 116, 90] },
};

export function characterStyle(character: TerrainCharacter): CharacterStyle {
  return CHARACTER_STYLES[character];
}
