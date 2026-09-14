import { PREVIEW_DEFAULTS, usePreviewStore } from './preview-store';
import type { MapLayerNode } from '../../utils/map-renderer';

describe('usePreviewStore', () => {
  beforeEach(() => {
    usePreviewStore.setState({ ...PREVIEW_DEFAULTS });
  });

  it('starts without a base layer and without overlay overrides', () => {
    const state = usePreviewStore.getState();

    expect(state.baseLayer).toBeUndefined();
    expect(state.overlays).toEqual({});
  });

  it('stores the selected base layer', () => {
    usePreviewStore.getState().setBaseLayer('noise');

    expect(usePreviewStore.getState().baseLayer).toBe('noise');
  });

  it('stores the navigation tree with the selected layer and preserves it when omitted', () => {
    const store = usePreviewStore.getState();
    const tree: readonly MapLayerNode[] = [
      {
        id: 'climate',
        label: 'Climate',
        available: true,
        selectedChild: 'macro-region',
        selectedLayer: 'macro-region',
      },
    ];
    store.setBaseLayer('macro-region', tree);
    store.setBaseLayer('noise');

    expect(usePreviewStore.getState().layerTree).toBe(tree);
  });

  it('merges overlay visibility changes', () => {
    usePreviewStore.getState().setOverlay('world-boundary', false);
    expect(usePreviewStore.getState().overlays).toEqual({ 'world-boundary': false });

    usePreviewStore.getState().setOverlay('world-boundary', true);
    expect(usePreviewStore.getState().overlays).toEqual({ 'world-boundary': true });
  });
});
