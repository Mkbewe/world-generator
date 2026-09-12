import type { MapBaseLayerId, MapOverlayId } from '../../utils/map-renderer';
import { createStore } from '../create-store';

export interface PreviewValues {
  baseLayer?: MapBaseLayerId;
  overlays: Partial<Record<MapOverlayId, boolean>>;
}

export const PREVIEW_DEFAULTS: PreviewValues = {
  baseLayer: undefined,
  overlays: {},
};

interface PreviewState extends PreviewValues {
  setBaseLayer: (layer: MapBaseLayerId) => void;
  setOverlay: (id: MapOverlayId, visible: boolean) => void;
}

export const usePreviewStore = createStore<PreviewState>(set => ({
  ...PREVIEW_DEFAULTS,
  setBaseLayer: baseLayer => set({ baseLayer }),
  setOverlay: (id, visible) => set(state => ({ overlays: { ...state.overlays, [id]: visible } })),
}));
