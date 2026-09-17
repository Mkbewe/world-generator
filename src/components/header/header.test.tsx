import { useEffect } from 'react';
import { MemoryRouter } from 'react-router';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { Header } from './header';
import { HeaderActionsProvider, useHeaderActions } from './header-actions-context';

interface RenderOptions {
  onToggleTheme?: () => void;
  currentTheme?: 'light' | 'dark';
}

function FullscreenBridge() {
  const { setCanFullscreen, setIsFullscreen } = useHeaderActions();

  useEffect(() => setCanFullscreen(true), [setCanFullscreen]);

  return (
    <button type='button' onClick={() => setIsFullscreen(false)}>
      Leave fullscreen
    </button>
  );
}

function renderHeader({ onToggleTheme, currentTheme }: RenderOptions = {}) {
  return render(
    <MemoryRouter>
      <HeaderActionsProvider>
        <FullscreenBridge />
        <Header onToggleTheme={onToggleTheme} currentTheme={currentTheme} />
      </HeaderActionsProvider>
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

  it('should return focus to the fullscreen trigger after leaving the mode', async () => {
    const user = userEvent.setup();
    renderHeader();

    const trigger = screen.getByRole('button', { name: 'Enter fullscreen' });
    await user.click(trigger);
    expect(screen.getByRole('button', { name: 'Exit fullscreen' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Leave fullscreen' }));

    expect(trigger).toHaveFocus();
  });
});
