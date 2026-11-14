import type { InspectorReadout } from '@readout';

import { MapReadoutStore } from './map-readout-store';

const READOUT: InspectorReadout = {
  position: { x: 1, y: 2, u: 0.25, v: 0.5 },
};

describe('MapReadoutStore', () => {
  it('stores readout and pinned state and notifies subscribers', () => {
    const store = new MapReadoutStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.setReadout(READOUT);

    expect(store.getSnapshot()).toEqual({ readout: READOUT, pinned: false });
    expect(store.isPinned()).toBe(false);
    expect(listener).toHaveBeenCalledOnce();

    store.togglePinned(READOUT);

    expect(store.getSnapshot()).toEqual({ readout: READOUT, pinned: true });
    expect(store.isPinned()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(2);

    store.clear();

    expect(store.getSnapshot()).toEqual({ readout: undefined, pinned: true });
    expect(listener).toHaveBeenCalledTimes(3);

    unsubscribe();
    store.setReadout(READOUT);

    expect(listener).toHaveBeenCalledTimes(3);
  });
});
