import { layerForTab, tabForLayer, useViewSyncStore, VIEW_SYNC_DEFAULTS } from './view-sync-store';

describe('view sync store', () => {
  it('maps stage tabs and preview layers both ways', () => {
    expect(layerForTab('noise')).toBe('noise');
    expect(layerForTab('general')).toBeUndefined();
    expect(layerForTab('heightmap')).toBe('heightmap');
    expect(tabForLayer('macro-region')).toBe('macro-region');
    // The corridor layers have no form any more, so they map to no tab.
    expect(tabForLayer('landmass-layout')).toBeUndefined();
    expect(tabForLayer('structure-character')).toBeUndefined();
  });

  it('has no preview layer for the geology tab until the plan layer lands', () => {
    // GEO-06B adds the geology plan layer; until then the linked mode is a no-op.
    expect(layerForTab('geology')).toBeUndefined();
  });

  it('starts unlinked on the general tab', () => {
    expect(VIEW_SYNC_DEFAULTS).toEqual({ settingsTab: 'general', linked: false });
    expect(useViewSyncStore.getState().linked).toBe(false);
  });
});
