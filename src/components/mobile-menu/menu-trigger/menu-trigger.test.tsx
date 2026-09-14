import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { MenuTrigger } from './menu-trigger';

describe('MenuTrigger', () => {
  it('exposes the open state and calls onOpen', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(
      <Theme>
        <MenuTrigger isOpen={false} onOpen={onOpen} />
      </Theme>
    );

    const button = screen.getByRole('button', { name: 'Open menu' });
    expect(button).toHaveAttribute('aria-expanded', 'false');

    await user.click(button);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
