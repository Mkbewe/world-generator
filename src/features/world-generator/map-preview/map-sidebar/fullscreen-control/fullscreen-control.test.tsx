import { createRef } from 'react';
import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { FullscreenControl } from './fullscreen-control';

function renderControl(active: boolean, onToggle = vi.fn()) {
  const triggerRef = createRef<HTMLButtonElement>();
  render(
    <Theme>
      <FullscreenControl active={active} triggerRef={triggerRef} onToggle={onToggle} />
    </Theme>
  );
  return { onToggle, triggerRef };
}

describe('FullscreenControl', () => {
  it('enters fullscreen from the sidebar', async () => {
    const user = userEvent.setup();
    const { onToggle } = renderControl(false);

    const button = screen.getByRole('button', { name: 'Enter fullscreen' });
    expect(button).toHaveAttribute('aria-pressed', 'false');

    await user.click(button);

    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('reports the active state', () => {
    const { triggerRef } = renderControl(true);

    const button = screen.getByRole('button', { name: 'Exit fullscreen' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(triggerRef.current).toBe(button);
  });
});
