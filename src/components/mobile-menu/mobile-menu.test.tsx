import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { MobileMenu } from './mobile-menu';
import { FeatureFlagsContext } from '../../feature-flags';
import { HeaderActionsContext } from '../header/header-actions-context';

interface RenderOptions {
  onToggleTheme?: () => void;
  currentTheme?: 'light' | 'dark';
  exportPng?: boolean;
  isMapGenerated?: boolean;
  onOpenDialog?: () => void;
}

function renderMenu({
  onToggleTheme,
  currentTheme,
  exportPng = true,
  isMapGenerated = true,
  onOpenDialog = vi.fn(),
}: RenderOptions = {}) {
  return render(
    <Theme>
      <FeatureFlagsContext.Provider value={{ exportPng, pipelinePreview: false }}>
        <HeaderActionsContext.Provider
          value={{
            exportMapRef: { current: undefined },
            isExportDialogOpen: false,
            setIsExportDialogOpen: onOpenDialog,
            confirmExport: vi.fn(),
            isMapGenerated,
            setIsMapGenerated: vi.fn(),
          }}
        >
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
    const mockOpenDialog = vi.fn();
    renderMenu({ onOpenDialog: mockOpenDialog });

    await user.click(screen.getByRole('button', { name: /open menu/i }));
    await user.click(await screen.findByRole('button', { name: /export png/i }));

    expect(mockOpenDialog).toHaveBeenCalledTimes(1);
    expect(mockOpenDialog).toHaveBeenCalledWith(true);
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
    renderMenu();

    await user.click(screen.getByRole('button', { name: /open menu/i }));
    await user.click(await screen.findByRole('button', { name: /close menu/i }));

    expect(screen.queryByRole('button', { name: /export png/i })).not.toBeInTheDocument();
  });
});
