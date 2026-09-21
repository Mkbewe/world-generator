import { type RefObject, useEffect } from 'react';

import { layerForTab, useViewSyncStore } from '../../../stores';
import type { MapBaseLayerId, MapRenderer } from '../../../utils/map-renderer';

interface UseTabSyncOptions {
  rendererRef: RefObject<MapRenderer | null>;
  onLayerChange: (layer: MapBaseLayerId) => void;
}

/**
 * Follows the linked settings tab with the preview: a tab change, or enabling
 * the link, selects its layer when the preview already holds that data.
 */
export function useTabSync({ rendererRef, onLayerChange }: UseTabSyncOptions): void {
  const settingsTab = useViewSyncStore(state => state.settingsTab);
  const linked = useViewSyncStore(state => state.linked);

  useEffect(() => {
    if (!linked) {
      return;
    }
    const layer = layerForTab(settingsTab);
    if (!layer) {
      return;
    }
    const available = rendererRef.current?.state.layers.some(
      option => option.id === layer && option.available
    );
    if (available) {
      onLayerChange(layer);
    }
  }, [linked, settingsTab, onLayerChange, rendererRef]);
}
