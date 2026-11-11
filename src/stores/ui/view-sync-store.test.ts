import {
  featureIdOnLayer,
  layerForTab,
  tabForLayer,
  useViewSyncStore,
  VIEW_SYNC_DEFAULTS,
} from './view-sync-store';

describe('view sync store', () => {
  beforeEach(() => {
    useViewSyncStore.setState({ ...VIEW_SYNC_DEFAULTS });
  });

  it('maps stage tabs and preview layers both ways', () => {
    expect(layerForTab('geology')).toBe('geology');
    expect(layerForTab('general')).toBeUndefined();
    expect(tabForLayer('macro-region')).toBe('macro-region');
    expect(layerForTab('heat-zones')).toBe('heat-zones');
    expect(tabForLayer('heat-zones')).toBe('heat-zones');
  });

  it('maps the geology tab to its plan layer', () => {
    expect(layerForTab('geology')).toBe('geology');
    expect(tabForLayer('geology')).toBe('geology');
  });

  it('starts unlinked on the general tab', () => {
    expect(VIEW_SYNC_DEFAULTS).toEqual({
      settingsTab: 'general',
      linked: false,
      selectedFeature: undefined,
    });
    expect(useViewSyncStore.getState().linked).toBe(false);
  });

  it('tracks the feature selected for editing', () => {
    useViewSyncStore.getState().selectFeature({ layerId: 'geology', featureId: 'region-3' });

    expect(useViewSyncStore.getState().selectedFeature).toEqual({
      layerId: 'geology',
      featureId: 'region-3',
    });
  });

  it('clears the selected feature', () => {
    useViewSyncStore.getState().selectFeature({ layerId: 'geology', featureId: 'region-3' });
    useViewSyncStore.getState().selectFeature(undefined);

    expect(useViewSyncStore.getState().selectedFeature).toBeUndefined();
  });

  it('updates the feature and settings tab together when a target tab is provided', () => {
    useViewSyncStore
      .getState()
      .selectFeature({ layerId: 'geology', featureId: 'region-3' }, 'heightmap');

    expect(useViewSyncStore.getState()).toMatchObject({
      selectedFeature: { layerId: 'geology', featureId: 'region-3' },
      settingsTab: 'heightmap',
    });
  });

  it('returns the feature id only for the matching layer', () => {
    const selection = { layerId: 'geology' as const, featureId: 'region-3' };

    expect(featureIdOnLayer(selection, 'geology')).toBe('region-3');
    expect(featureIdOnLayer(selection, 'heightmap')).toBeUndefined();
    expect(featureIdOnLayer(undefined, 'geology')).toBeUndefined();
  });
});
