import { MemoryRouter } from 'react-router';
import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { MobileMenu } from './mobile-menu';

interface RenderOptions {
  onToggleTheme?: () => void;
  currentTheme?: 'light' | 'dark';
  initialEntries?: string[];
}

function renderMenu({ onToggleTheme, currentTheme, initialEntries }: RenderOptions = {}) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
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

  it('should reveal the navigation links when opened', async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole('button', { name: /open menu/i }));

    expect(await screen.findByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Statistics' })).toHaveAttribute('href', '/statistics');
    expect(screen.getByRole('link', { name: 'Legacy Generator' })).toHaveAttribute(
      'href',
      '/legacy-generator'
    );
  });

  it('should mark the current route link as active', async () => {
    const user = userEvent.setup();
    renderMenu({ initialEntries: ['/statistics'] });

    await user.click(screen.getByRole('button', { name: /open menu/i }));
    await screen.findByRole('heading', { name: 'Menu' });

    expect(screen.getByRole('link', { name: 'Statistics' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current');
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
    await screen.findByRole('heading', { name: 'Menu' });

    expect(screen.queryByRole('button', { name: /switch to/i })).not.toBeInTheDocument();
  });

  it('should close when the close button is clicked', async () => {
    const user = userEvent.setup();
    renderMenu({ onToggleTheme: () => {}, currentTheme: 'light' });

    await user.click(screen.getByRole('button', { name: /open menu/i }));
    await user.click(await screen.findByRole('button', { name: /close menu/i }));

    expect(screen.queryByRole('button', { name: /switch to dark mode/i })).not.toBeInTheDocument();
  });
});
