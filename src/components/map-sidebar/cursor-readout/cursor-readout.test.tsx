import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';

import { CursorReadout } from './cursor-readout';
import type { ReadoutItem } from '../../../utils/map-readout';

const ITEMS: readonly ReadoutItem[] = [{ id: 'position', label: 'Position', value: 'X 1' }];

describe('CursorReadout', () => {
  it('renders the readout items', () => {
    render(
      <Theme>
        <CursorReadout items={ITEMS} />
      </Theme>
    );

    expect(screen.getByRole('group', { name: 'Cursor readout' })).toBeInTheDocument();
    expect(screen.getByText('Position:')).toBeInTheDocument();
    expect(screen.getByText('X 1')).toBeInTheDocument();
  });

  it('marks the pinned readout', () => {
    render(
      <Theme>
        <CursorReadout items={ITEMS} pinned />
      </Theme>
    );

    expect(screen.getByRole('group', { name: 'Cursor readout (pinned)' })).toBeInTheDocument();
  });
});
