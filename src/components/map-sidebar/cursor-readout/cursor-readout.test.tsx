import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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

  it('renders an action entry as a button and reports it', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    const items: readonly ReadoutItem[] = [
      ...ITEMS,
      {
        id: 'edit-region',
        label: 'Edit region',
        value: '',
        action: { id: 'edit-region', label: 'Edit region' },
      },
    ];

    render(
      <Theme>
        <CursorReadout items={items} onAction={onAction} />
      </Theme>
    );

    await user.click(screen.getByRole('button', { name: 'Edit region' }));

    expect(onAction).toHaveBeenCalledWith('edit-region');
  });

  it('renders repeated line labels without duplicate keys', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const items: readonly ReadoutItem[] = [
      {
        id: 'position',
        label: 'Position',
        value: 'X 1',
        lines: [
          { label: 'Position', x: 'X 1 cell', y: 'Y 2 cell' },
          { label: 'Position', x: 'X 3 m', y: 'Y 4 m' },
        ],
      },
    ];

    try {
      render(
        <Theme>
          <CursorReadout items={items} />
        </Theme>
      );

      expect(screen.getByText('X 3 m')).toBeInTheDocument();
      expect(error).not.toHaveBeenCalled();
    } finally {
      error.mockRestore();
    }
  });
});
