import { Theme } from '@radix-ui/themes';
import type { InspectorReadout } from '@readout';
import { act, render, screen } from '@testing-library/react';

import { MapReadout } from './map-readout';
import { MapReadoutStore } from '../lib/map-readout-store';

const READOUT: InspectorReadout = {
  position: { x: 1, y: 2, u: 0.25, v: 0.5 },
};

function renderReadout(store: MapReadoutStore) {
  return render(
    <Theme>
      <MapReadout store={store} info={{}} actions onAction={() => {}} />
    </Theme>
  );
}

describe('MapReadout', () => {
  it('renders the store readout and follows pin changes', () => {
    const store = new MapReadoutStore();
    renderReadout(store);

    act(() => store.setReadout(READOUT));

    expect(screen.getByText('X 1 cell')).toBeInTheDocument();
    expect(screen.getByText('Y 2 cell')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Cursor readout' })).toBeInTheDocument();

    act(() => store.togglePinned(READOUT));

    expect(screen.getByRole('group', { name: 'Cursor readout (pinned)' })).toBeInTheDocument();

    act(() => store.clear());

    expect(screen.queryByText('X 1 cell')).toBeNull();
  });
});
