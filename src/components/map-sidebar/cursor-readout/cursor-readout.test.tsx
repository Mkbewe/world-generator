import { Theme } from '@radix-ui/themes';
import type { ReadoutItem } from '@readout';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CursorReadout } from './cursor-readout';

const ITEMS: readonly ReadoutItem[] = [
  { id: 'position', labelKey: 'readout.position', value: 'X 1' },
];

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

  it('renders an overlay group heading', () => {
    render(
      <Theme>
        <CursorReadout
          items={[
            {
              id: 'overlays',
              labelKey: 'readout.overlays',
              value: '',
              heading: true,
              detached: true,
            },
          ]}
        />
      </Theme>
    );

    expect(screen.getByText('Overlays')).toHaveClass(/heading/);
  });

  it('separates a detached entry from the stage data', () => {
    render(
      <Theme>
        <CursorReadout
          items={[
            { id: 'stage', labelKey: 'readout.name', value: 'A' },
            { id: 'overlay', labelKey: 'readout.oceanCurrent', value: 'B', detached: true },
          ]}
        />
      </Theme>
    );

    expect(screen.getByText('Ocean current:').parentElement).toHaveClass(/detached/);
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
        labelKey: 'readout.editRegion',
        value: '',
        action: { id: 'edit-region', labelKey: 'readout.editRegion' },
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
        labelKey: 'readout.position',
        value: 'X 1',
        lines: [
          { labelKey: 'readout.position', x: 'X 1 cell', y: 'Y 2 cell' },
          { labelKey: 'readout.position', x: 'X 3 m', y: 'Y 4 m' },
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
