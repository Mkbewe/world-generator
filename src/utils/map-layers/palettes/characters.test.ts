import { CHARACTER_STYLES, characterStyle } from './characters';
import { TERRAIN_CHARACTERS } from '../../map-generator';

describe('character styles', () => {
  it('styles every character with a label and a colour', () => {
    for (const character of TERRAIN_CHARACTERS) {
      const style = characterStyle(character);
      expect(style.label.length).toBeGreaterThan(0);
      expect(style.color).toHaveLength(3);
    }
  });

  it('keeps a style for every known character', () => {
    expect(Object.keys(CHARACTER_STYLES).sort()).toEqual([...TERRAIN_CHARACTERS].sort());
  });
});
