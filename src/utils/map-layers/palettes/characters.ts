import type { TerrainCharacter } from '../../map-generator/types';
import type { Color } from '../catalog/layer-spec';

export interface CharacterStyle {
  readonly label: string;
  readonly color: Color;
}

/** Colour and label of every primary terrain character. */
export const CHARACTER_STYLES: Readonly<Record<TerrainCharacter, CharacterStyle>> = {
  plains: { label: 'Plains', color: [110, 168, 92] },
  hills: { label: 'Hills', color: [214, 178, 88] },
  mountains: { label: 'Mountains', color: [146, 116, 90] },
};

export function characterStyle(character: TerrainCharacter): CharacterStyle {
  return CHARACTER_STYLES[character];
}
