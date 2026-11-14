import { MemoryRouter } from 'react-router';
import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { Header } from './header';
import { HeaderActionsProvider, useHeaderActions } from './header-actions-context';

interface RenderOptions {
  onToggleTheme?: () => void;
  currentTheme?: 'light' | 'dark';
}

function FullscreenState() {
  const { setIsFullscreen } = useHeaderActions();

  return (
    <button type='button' onClick={() => setIsFullscreen(true)}>
      Enter mode
    </button>
  );
}

function renderHeader({ onToggleTheme, currentTheme }: RenderOptions = {}) {
  return render(
    <MemoryRouter>
      <Theme>
        <HeaderActionsProvider>
          <FullscreenState />
          <Header onToggleTheme={onToggleTheme} currentTheme={currentTheme} />
        </HeaderActionsProvider>
      </Theme>
    </MemoryRouter>
  );
}

describe('Header', () => {
  it('should render successfully', () => {
    const { container } = renderHeader();
    expect(container).toBeTruthy();
  });

  it('should display logo and title', () => {
    renderHeader();

    const title = screen.getByText('World Generator');
    expect(title).toBeInTheDocument();
  });

  it('should render the theme toggle when a handler is provided and call it', async () => {
    const user = userEvent.setup();
    const mockToggle = vi.fn();
    renderHeader({ onToggleTheme: mockToggle, currentTheme: 'light' });

    await user.click(screen.getByRole('button', { name: /switch to dark mode/i }));

    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it('should not render the theme toggle when no handler is provided', () => {
    renderHeader();

    expect(screen.queryByRole('button', { name: /switch to/i })).not.toBeInTheDocument();
  });

  it('shows the fullscreen status and the escape hint without a toggle', async () => {
    const user = userEvent.setup();
    renderHeader();

    expect(screen.queryByRole('button', { name: /fullscreen/i })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Enter mode' }));

    expect(screen.getByText('Fullscreen')).toBeInTheDocument();
    expect(screen.getByText('Esc')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /fullscreen/i })).toBeNull();
  });
});
