import { MACRO_REGION_FORM_DEFAULTS, useMacroRegionFormStore } from './macro-region-form-store';
import {
  baseRegions,
  overlayRegions,
  regionSegments,
} from '../../utils/map-generator/stages/macro-region-sizes';

describe('useMacroRegionFormStore', () => {
  beforeEach(() => {
    useMacroRegionFormStore.setState({ ...MACRO_REGION_FORM_DEFAULTS });
  });

  it('starts with four adjacent radial regions', () => {
    const state = useMacroRegionFormStore.getState();

    expect(state.layout).toBe('radial');
    expect(baseRegions(state.regions)).toHaveLength(4);
    expect(regionSegments('radial', state.regions).map(segment => segment.percent)).toEqual([
      25, 25, 25, 25,
    ]);
  });

  it('moves shared boundaries without changing the region count', () => {
    useMacroRegionFormStore.getState().setRegionBoundaries([20, 50, 80]);

    const state = useMacroRegionFormStore.getState();
    expect(regionSegments('radial', state.regions).map(segment => segment.percent)).toEqual([
      20, 30, 30, 20,
    ]);
  });

  it('applies a complete preset as a new editable starting point', () => {
    const store = useMacroRegionFormStore.getState();
    store.updateRegion(store.regions[0].id, { label: 'Changed manually' });

    store.applyPreset('rings-with-poles');

    let state = useMacroRegionFormStore.getState();
    expect(state.layout).toBe('radial');
    expect(baseRegions(state.regions)).toHaveLength(4);
    expect(overlayRegions(state.regions)).toHaveLength(2);
    expect(state.regions.some(region => region.label === 'Changed manually')).toBe(false);

    store.applyPreset('horizontal');
    state = useMacroRegionFormStore.getState();
    expect(state.layout).toBe('horizontal');
    expect(baseRegions(state.regions)).toHaveLength(5);
    expect(overlayRegions(state.regions)).toHaveLength(0);
  });

  it('changes layout while preserving region metadata and overlays', () => {
    const store = useMacroRegionFormStore.getState();
    const firstRegionId = store.regions[0].id;
    store.updateRegion(firstRegionId, { label: 'Home' });
    store.addOverlay('y');
    const overlayBefore = overlayRegions(useMacroRegionFormStore.getState().regions)[0];

    store.applyLayout('vertical');

    const state = useMacroRegionFormStore.getState();
    expect(state.layout).toBe('vertical');
    expect(
      baseRegions(state.regions).every(
        region => region.geometry.kind === 'band' && region.geometry.axis === 'x'
      )
    ).toBe(true);
    expect(baseRegions(state.regions)[0]).toMatchObject({ id: firstRegionId, label: 'Home' });
    expect(overlayRegions(state.regions)[0]).toEqual(overlayBefore);
  });

  it('adds and removes base regions while preserving full coverage', () => {
    const store = useMacroRegionFormStore.getState();
    store.addBaseRegion();

    let state = useMacroRegionFormStore.getState();
    expect(baseRegions(state.regions)).toHaveLength(5);
    expect(
      regionSegments(state.layout, state.regions).reduce((total, item) => total + item.percent, 0)
    ).toBeCloseTo(100, 8);

    store.removeRegion(baseRegions(state.regions)[1].id);
    state = useMacroRegionFormStore.getState();
    expect(baseRegions(state.regions)).toHaveLength(4);
    expect(
      regionSegments(state.layout, state.regions).reduce((total, item) => total + item.percent, 0)
    ).toBeCloseTo(100, 8);
  });

  it('adds, edits, and removes an overlay band independently of the base layout', () => {
    const store = useMacroRegionFormStore.getState();
    store.addOverlay('x');

    let state = useMacroRegionFormStore.getState();
    const overlay = overlayRegions(state.regions)[0];
    expect(overlay.geometry).toMatchObject({ kind: 'band', axis: 'x' });

    store.updateOverlay(overlay.id, { axis: 'y', center: 0.2, width: 0.3, irregularity: 0.02 });
    store.updateRegion(overlay.id, { danger: 0.75 });

    state = useMacroRegionFormStore.getState();
    expect(overlayRegions(state.regions)[0]).toMatchObject({
      danger: 0.75,
      irregularity: 0.02,
      geometry: { kind: 'band', axis: 'y', center: 0.2, width: 0.3 },
    });

    store.removeRegion(overlay.id);
    expect(overlayRegions(useMacroRegionFormStore.getState().regions)).toHaveLength(0);
    expect(baseRegions(useMacroRegionFormStore.getState().regions)).toHaveLength(4);
  });

  it('keeps at least one base region', () => {
    const store = useMacroRegionFormStore.getState();
    for (const region of baseRegions(store.regions).slice(1)) {
      store.removeRegion(region.id);
    }
    const last = baseRegions(useMacroRegionFormStore.getState().regions)[0];
    store.removeRegion(last.id);

    expect(baseRegions(useMacroRegionFormStore.getState().regions)).toHaveLength(1);
  });

  it('limits base and overlay regions to ten in total', () => {
    const store = useMacroRegionFormStore.getState();
    while (useMacroRegionFormStore.getState().regions.length < 10) {
      store.addBaseRegion();
    }
    const regions = useMacroRegionFormStore.getState().regions;

    store.addBaseRegion();
    store.addOverlay('y');

    expect(useMacroRegionFormStore.getState().regions).toBe(regions);
  });

  it('updates border deformation', () => {
    useMacroRegionFormStore.getState().setDeformation({ amplitude: 0.2, frequency: 5 });

    expect(useMacroRegionFormStore.getState().deformation).toMatchObject({
      amplitude: 0.2,
      frequency: 5,
    });
  });
});
