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

    expect(store.getSnapshot()).toEqual({ readout: READOUT, pinned: true });
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    store.setReadout(READOUT);

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('keeps a pinned readout frozen until it is unpinned', () => {
    const store = new MapReadoutStore();
    store.setReadout(READOUT);
    store.togglePinned(READOUT);

    store.setReadout({ ...READOUT, position: { x: 3, y: 4, u: 0.75, v: 1 } });

    expect(store.getSnapshot()).toEqual({ readout: READOUT, pinned: true });

    store.unpin();
    store.clear();

    expect(store.getSnapshot()).toEqual({ readout: undefined, pinned: false });
  });

  it('unpins without clearing the readout', () => {
    const store = new MapReadoutStore();
    store.setReadout(READOUT);
    store.togglePinned(READOUT);

    store.unpin();

    expect(store.getSnapshot()).toEqual({ readout: READOUT, pinned: false });
  });
});
