import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PinControl } from './pin-control';

function renderControl(pinning: boolean) {
  const onToggle = vi.fn();
  render(
    <Theme>
      <PinControl pinning={pinning} onToggle={onToggle} />
    </Theme>
  );
  return { onToggle };
}

describe('PinControl', () => {
  it('reports the pin mode state', () => {
    renderControl(false);

    expect(screen.getByRole('button', { name: 'Pin' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('reports a toggle request', async () => {
    const user = userEvent.setup();
    const { onToggle } = renderControl(true);

    const button = screen.getByRole('button', { name: 'Pin' });
    expect(button).toHaveAttribute('aria-pressed', 'true');

    await user.click(button);

    expect(onToggle).toHaveBeenCalledOnce();
  });
});
