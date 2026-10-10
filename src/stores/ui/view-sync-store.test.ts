import { layerForTab, tabForLayer, useViewSyncStore, VIEW_SYNC_DEFAULTS } from './view-sync-store';

describe('view sync store', () => {
  it('maps stage tabs and preview layers both ways', () => {
    expect(layerForTab('geology')).toBe('geology');
    expect(layerForTab('general')).toBeUndefined();
    expect(tabForLayer('macro-region')).toBe('macro-region');
  });

  it('maps the geology tab to its plan layer', () => {
    expect(layerForTab('geology')).toBe('geology');
    expect(tabForLayer('geology')).toBe('geology');
  });

  it('starts unlinked on the general tab', () => {
    expect(VIEW_SYNC_DEFAULTS).toEqual({
      settingsTab: 'general',
      linked: false,
      selectedRegionId: undefined,
    });
    expect(useViewSyncStore.getState().linked).toBe(false);
  });

  it('tracks the region selected for editing', () => {
    useViewSyncStore.getState().setSelectedRegion('region-3');

    expect(useViewSyncStore.getState().selectedRegionId).toBe('region-3');
  });
});
