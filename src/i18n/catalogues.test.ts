import { CATALOGUES } from './catalogues';

describe('catalogues', () => {
  it('share the same message keys', () => {
    const referenceKeys = Object.keys(CATALOGUES.en).sort();

    for (const catalogue of Object.values(CATALOGUES)) {
      expect(Object.keys(catalogue).sort()).toEqual(referenceKeys);
    }
  });
});
