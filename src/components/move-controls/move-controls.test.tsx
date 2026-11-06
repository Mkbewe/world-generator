import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { MoveControls } from './move-controls';

describe('MoveControls', () => {
  it('reports earlier and later moves', async () => {
    const user = userEvent.setup();
    const earlier = vi.fn();
    const later = vi.fn();
    render(
      <Theme>
        <MoveControls canMoveEarlier canMoveLater onMoveEarlier={earlier} onMoveLater={later} />
      </Theme>
    );

    await user.click(screen.getByRole('button', { name: 'Move earlier' }));
    await user.click(screen.getByRole('button', { name: 'Move later' }));

    expect(earlier).toHaveBeenCalledOnce();
    expect(later).toHaveBeenCalledOnce();
  });

  it('disables the ends of the list', () => {
    render(
      <Theme>
        <MoveControls
          canMoveEarlier={false}
          canMoveLater={false}
          onMoveEarlier={() => {}}
          onMoveLater={() => {}}
        />
      </Theme>
    );

    expect(screen.getByRole('button', { name: 'Move earlier' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move later' })).toBeDisabled();
  });
});
