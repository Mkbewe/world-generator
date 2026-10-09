import { beforeEach, describe, expect, it } from 'vitest';

import { GEOLOGY_FORM_DEFAULTS, geologyConfigOf, useGeologyFormStore } from './geology-form-store';
import { MAX_GEOLOGICAL_REGIONS } from '../../../utils/map-generator/stages/geology';

describe('geology form store', () => {
  beforeEach(() => {
    useGeologyFormStore.setState({ ...GEOLOGY_FORM_DEFAULTS });
  });

  it('exposes only the active regions to the generator', () => {
    const config = geologyConfigOf(useGeologyFormStore.getState());

    expect(config.regionCount).toBe(GEOLOGY_FORM_DEFAULTS.regionCount);
    expect(config.regions).toHaveLength(config.regionCount);
    expect(GEOLOGY_FORM_DEFAULTS.slots).toHaveLength(MAX_GEOLOGICAL_REGIONS);
  });

  it('keeps edits of a slot when the count drops and rises again', () => {
    useGeologyFormStore.getState().setRegion(4, { size: 1.7, type: 'atoll' });
    useGeologyFormStore.getState().setRegionCount(3);

    expect(geologyConfigOf(useGeologyFormStore.getState()).regions).toHaveLength(3);

    useGeologyFormStore.getState().setRegionCount(5);
    expect(geologyConfigOf(useGeologyFormStore.getState()).regions[4]).toMatchObject({
      size: 1.7,
      type: 'atoll',
    });
  });

  it('applies a preset to every editable slot', () => {
    useGeologyFormStore.getState().applyPreset('mosaic');
    const state = useGeologyFormStore.getState();

    expect(state.regionCount).toBe(9);
    expect(state.slots).toHaveLength(MAX_GEOLOGICAL_REGIONS);
    expect(geologyConfigOf(state).regions).toHaveLength(9);
  });

  it('clamps the count to the supported range', () => {
    useGeologyFormStore.getState().setRegionCount(0);
    expect(useGeologyFormStore.getState().regionCount).toBe(1);

    useGeologyFormStore.getState().setRegionCount(99);
    expect(useGeologyFormStore.getState().regionCount).toBe(MAX_GEOLOGICAL_REGIONS);
  });

  it('moves only the two shares beside a dragged boundary', () => {
    const before = useGeologyFormStore.getState().slots;
    useGeologyFormStore.getState().setRegionShareBoundary(0, 30);

    const slots = useGeologyFormStore.getState().slots;
    expect(slots[0]?.size).toBeCloseTo(1.5);
    expect(slots[1]?.size).toBeCloseTo(0.6);
    expect(slots.slice(2)).toEqual(before.slice(2));
  });
});
