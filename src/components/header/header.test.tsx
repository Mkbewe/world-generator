import { MemoryRouter } from 'react-router';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { Header } from './header';

interface RenderOptions {
  onToggleTheme?: () => void;
  currentTheme?: 'light' | 'dark';
}

function renderHeader({ onToggleTheme, currentTheme }: RenderOptions = {}) {
  return render(
    <MemoryRouter>
      <Header onToggleTheme={onToggleTheme} currentTheme={currentTheme} />
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
});
