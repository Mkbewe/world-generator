import { useCallback } from 'react';
import type { ReadoutAction } from '@readout';

import { useViewSyncStore } from '../../../../stores';

/** Applies a readout action's declared feature and settings target. */
export function usePreviewReadoutAction(): (action: ReadoutAction) => void {
  return useCallback((action: ReadoutAction): void => {
    const { target } = action;
    useViewSyncStore
      .getState()
      .selectFeature({ layerId: target.layerId, featureId: target.featureId }, target.settingsTab);
  }, []);
}
