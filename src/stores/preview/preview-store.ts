import type { MapBaseLayerId, MapLayerNode, MapOverlayId } from '../../utils/map-renderer';
import { createStore } from '../create-store';

export interface PreviewValues {
  baseLayer?: MapBaseLayerId;
  layerTree: readonly MapLayerNode[];
  overlays: Partial<Record<MapOverlayId, boolean>>;
}

export const PREVIEW_DEFAULTS: PreviewValues = {
  baseLayer: undefined,
  layerTree: [],
  overlays: {},
};

interface PreviewState extends PreviewValues {
  setBaseLayer: (layer: MapBaseLayerId, layerTree?: readonly MapLayerNode[]) => void;
  setOverlay: (id: MapOverlayId, visible: boolean) => void;
}

export const usePreviewStore = createStore<PreviewState>(set => ({
  ...PREVIEW_DEFAULTS,
  setBaseLayer: (baseLayer, layerTree) =>
    set(state => ({
      baseLayer,
      layerTree: layerTree ?? state.layerTree,
    })),
  setOverlay: (id, visible) => set(state => ({ overlays: { ...state.overlays, [id]: visible } })),
}));
