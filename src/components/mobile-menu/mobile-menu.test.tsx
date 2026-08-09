import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { MobileMenu } from './mobile-menu';
import { FeatureFlagsContext } from '../../feature-flags';
import { HeaderActionsContext } from '../header/header-actions-context';

interface RenderOptions {
  exportMap?: () => void;
  onToggleTheme?: () => void;
  currentTheme?: 'light' | 'dark';
  exportPng?: boolean;
}

function renderMenu({
  exportMap,
  onToggleTheme,
  currentTheme,
  exportPng = true,
}: RenderOptions = {}) {
  return render(
    <Theme>
      <FeatureFlagsContext.Provider value={{ exportPng }}>
        <HeaderActionsContext.Provider value={{ exportMapRef: { current: exportMap } }}>
          <MobileMenu onToggleTheme={onToggleTheme} currentTheme={currentTheme} />
        </HeaderActionsContext.Provider>
      </FeatureFlagsContext.Provider>
    </Theme>
  );
}

describe('MobileMenu', () => {
  it('should render the menu trigger', () => {
    renderMenu();
    expect(screen.getByRole('button', { name: /open menu/i })).toBeInTheDocument();
  });

  it('should reveal the export action and call the handler when opened', async () => {
    const user = userEvent.setup();
    const mockExport = vi.fn();
    renderMenu({ exportMap: mockExport });

    await user.click(screen.getByRole('button', { name: /open menu/i }));
    await user.click(await screen.findByRole('button', { name: /export png/i }));

    expect(mockExport).toHaveBeenCalledTimes(1);
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
    await screen.findByRole('button', { name: /export png/i });

    expect(screen.queryByRole('button', { name: /switch to/i })).not.toBeInTheDocument();
  });

  it('should close when the close button is clicked', async () => {
    const user = userEvent.setup();
    renderMenu({ exportMap: vi.fn() });

    await user.click(screen.getByRole('button', { name: /open menu/i }));
    await user.click(await screen.findByRole('button', { name: /close menu/i }));

    expect(screen.queryByRole('button', { name: /export png/i })).not.toBeInTheDocument();
  });
});
