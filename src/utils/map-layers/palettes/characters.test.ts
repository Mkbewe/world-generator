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

  it('keeps plains green, hills ochre and mountains brown', () => {
    const [plainsR, plainsG, plainsB] = CHARACTER_STYLES.plains.color;
    expect(plainsG).toBeGreaterThan(plainsR);
    expect(plainsG).toBeGreaterThan(plainsB);

    const [hillsR, hillsG, hillsB] = CHARACTER_STYLES.hills.color;
    expect(hillsR).toBeGreaterThan(hillsB);
    expect(hillsG).toBeGreaterThan(hillsB);

    const [mountainsR, mountainsG, mountainsB] = CHARACTER_STYLES.mountains.color;
    expect(mountainsR).toBeGreaterThan(mountainsG);
    expect(mountainsG).toBeGreaterThan(mountainsB);
  });
});
