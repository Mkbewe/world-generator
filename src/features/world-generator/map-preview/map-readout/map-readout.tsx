import { useSyncExternalStore } from 'react';
import type { Measurement, ReadoutAction, ReadoutInfo } from '@readout';

import type { MapReadoutStore } from '../lib/map-readout-store';
import { readoutItems } from '../lib/readout-registry';
import { CursorReadout } from '../map-sidebar/cursor-readout';

interface MapReadoutProps {
  readonly store: MapReadoutStore;
  readonly info: ReadoutInfo;
  readonly measurement?: Measurement;
  readonly actions: boolean;
  readonly onAction: (action: ReadoutAction) => void;
}

export function MapReadout({ store, info, measurement, actions, onAction }: MapReadoutProps) {
  const { readout, pinned } = useSyncExternalStore(store.subscribe, store.getSnapshot);

  return (
    <CursorReadout
      items={readoutItems(readout, info, measurement, { actions })}
      pinned={pinned}
      onAction={onAction}
    />
  );
}
