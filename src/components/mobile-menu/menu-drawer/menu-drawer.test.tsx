import { MemoryRouter } from 'react-router';
import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { MenuDrawer } from './menu-drawer';

interface RenderOptions {
  onClose?: () => void;
  onToggleTheme?: () => void;
  currentTheme?: 'light' | 'dark';
}

function renderDrawer({ onClose = () => {}, onToggleTheme, currentTheme }: RenderOptions = {}) {
  return render(
    <MemoryRouter>
      <Theme>
        <MenuDrawer onClose={onClose} onToggleTheme={onToggleTheme} currentTheme={currentTheme} />
      </Theme>
    </MemoryRouter>
  );
}

describe('MenuDrawer', () => {
  it('renders the navigation links and closes after navigating', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderDrawer({ onClose });

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    await user.click(screen.getByRole('link', { name: 'Home' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes from the close button', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderDrawer({ onClose });

    await user.click(screen.getByRole('button', { name: 'Close menu' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows the theme toggle only when a handler is provided', async () => {
    const user = userEvent.setup();
    const onToggleTheme = vi.fn();
    renderDrawer({ onToggleTheme, currentTheme: 'light' });

    await user.click(screen.getByRole('button', { name: 'Switch to dark mode' }));

    expect(onToggleTheme).toHaveBeenCalledTimes(1);
  });
});
