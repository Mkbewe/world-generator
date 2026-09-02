import { MemoryRouter } from 'react-router';
import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { MobileMenu } from './mobile-menu';

interface RenderOptions {
  onToggleTheme?: () => void;
  currentTheme?: 'light' | 'dark';
}

function renderMenu({ onToggleTheme, currentTheme }: RenderOptions = {}) {
  return render(
    <MemoryRouter>
      <Theme>
        <MobileMenu onToggleTheme={onToggleTheme} currentTheme={currentTheme} />
      </Theme>
    </MemoryRouter>
  );
}

describe('MobileMenu', () => {
  it('should render the menu trigger', () => {
    renderMenu();
    expect(screen.getByRole('button', { name: /open menu/i })).toBeInTheDocument();
  });

  it('should reveal the statistics link when opened', async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole('button', { name: /open menu/i }));

    expect(await screen.findByRole('link', { name: 'Statistics' })).toHaveAttribute(
      'href',
      '/statistics'
    );
  });

  it('should reveal the legacy generator link when opened', async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole('button', { name: /open menu/i }));

    expect(await screen.findByRole('link', { name: 'Legacy Generator' })).toHaveAttribute(
      'href',
      '/legacy-generator'
    );
  });

  it('should show the theme toggle when provided and call it', async () => {
    const user = userEvent.setup();
    const mockToggle = vi.fn();
    renderMenu({ onToggleTheme: mockToggle, currentTheme: 'light' });

    await user.click(screen.getByRole('button', { name: /open menu/i }));
    await user.click(await screen.findByRole('button', { name: /switch to dark mode/i }));

    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it('should not show the theme toggle when no handler is provided', async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole('button', { name: /open menu/i }));
    await screen.findByRole('link', { name: 'Statistics' });

    expect(screen.queryByRole('button', { name: /switch to/i })).not.toBeInTheDocument();
  });

  it('should close when the close button is clicked', async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole('button', { name: /open menu/i }));
    await user.click(await screen.findByRole('button', { name: /close menu/i }));

    expect(screen.queryByRole('link', { name: 'Statistics' })).not.toBeInTheDocument();
  });
});
