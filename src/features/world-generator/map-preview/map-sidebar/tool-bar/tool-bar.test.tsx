import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ToolBar } from './tool-bar';

function renderToolBar(overrides: Partial<Parameters<typeof ToolBar>[0]> = {}) {
  const props = {
    measuring: true,
    onToggleMeasuring: vi.fn(),
    pinning: true,
    onTogglePinning: vi.fn(),
    ...overrides,
  };
  render(
    <Theme>
      <ToolBar {...props} />
    </Theme>
  );
  return props;
}

describe('ToolBar', () => {
  it('shows the tools section with the active modes', () => {
    renderToolBar();

    expect(screen.getByText('Tools')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Measure' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Pin' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('toggles the measure mode', async () => {
    const user = userEvent.setup();
    const props = renderToolBar({ measuring: false });

    const button = screen.getByRole('button', { name: 'Measure' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    await user.click(button);

    expect(props.onToggleMeasuring).toHaveBeenCalledOnce();
  });

  it('toggles the pin mode', async () => {
    const user = userEvent.setup();
    const props = renderToolBar({ pinning: false });

    const button = screen.getByRole('button', { name: 'Pin' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    await user.click(button);

    expect(props.onTogglePinning).toHaveBeenCalledOnce();
  });
});
