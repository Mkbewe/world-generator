import { REGION_STYLES, regionStyle } from './regions';
import { GEOLOGICAL_REGION_TYPES } from '../../map-generator/types';

describe('region styles', () => {
  it('styles every region type with a label, a character and a colour', () => {
    for (const type of GEOLOGICAL_REGION_TYPES) {
      const style = regionStyle(type);
      expect(style.label.length).toBeGreaterThan(0);
      expect(style.description.length).toBeGreaterThan(0);
      expect(style.color).toHaveLength(3);
    }
  });

  it('keeps a style for every known type', () => {
    expect(Object.keys(REGION_STYLES).sort()).toEqual([...GEOLOGICAL_REGION_TYPES].sort());
  });
});
