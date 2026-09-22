import { layerForTab, tabForLayer, useViewSyncStore, VIEW_SYNC_DEFAULTS } from './view-sync-store';

describe('view sync store', () => {
  it('maps stage tabs and preview layers both ways', () => {
    expect(layerForTab('noise')).toBe('noise');
    expect(layerForTab('general')).toBeUndefined();
    expect(layerForTab('landmass-layout')).toBe('landmass-layout');
    expect(tabForLayer('macro-region')).toBe('macro-region');
    expect(tabForLayer('landmass-layout')).toBe('landmass-layout');
  });

  it('starts unlinked on the general tab', () => {
    expect(VIEW_SYNC_DEFAULTS).toEqual({ settingsTab: 'general', linked: false });
    expect(useViewSyncStore.getState().linked).toBe(false);
  });
});
