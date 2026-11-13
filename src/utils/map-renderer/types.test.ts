import { isSameFeatureSelection, type MapFeatureSelection } from './types';

const GEOLOGY_SELECTION: MapFeatureSelection = { layerId: 'geology', featureId: 'region-1' };

describe('isSameFeatureSelection', () => {
  it('treats the same reference as equal', () => {
    expect(isSameFeatureSelection(GEOLOGY_SELECTION, GEOLOGY_SELECTION)).toBe(true);
  });

  it('treats two cleared selections as equal', () => {
    expect(isSameFeatureSelection(undefined, undefined)).toBe(true);
  });

  it('treats a defined and a cleared selection as different', () => {
    expect(isSameFeatureSelection(GEOLOGY_SELECTION, undefined)).toBe(false);
    expect(isSameFeatureSelection(undefined, GEOLOGY_SELECTION)).toBe(false);
  });

  it('compares structurally equal selections as equal', () => {
    expect(isSameFeatureSelection(GEOLOGY_SELECTION, { ...GEOLOGY_SELECTION })).toBe(true);
  });

  it('distinguishes selections on different layers', () => {
    expect(
      isSameFeatureSelection(GEOLOGY_SELECTION, {
        layerId: 'world-shape',
        featureId: 'region-1',
      })
    ).toBe(false);
  });

  it('distinguishes different features on the same layer', () => {
    expect(
      isSameFeatureSelection(GEOLOGY_SELECTION, { layerId: 'geology', featureId: 'region-2' })
    ).toBe(false);
  });
});
