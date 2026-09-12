import { PREVIEW_DEFAULTS, usePreviewStore } from './preview-store';

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

  it('merges overlay visibility changes', () => {
    usePreviewStore.getState().setOverlay('world-boundary', false);
    expect(usePreviewStore.getState().overlays).toEqual({ 'world-boundary': false });

    usePreviewStore.getState().setOverlay('world-boundary', true);
    expect(usePreviewStore.getState().overlays).toEqual({ 'world-boundary': true });
  });
});
