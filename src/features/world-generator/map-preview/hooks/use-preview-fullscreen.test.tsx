import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { usePreviewFullscreen } from './use-preview-fullscreen';
import { HeaderActionsProvider, useHeaderActions } from '../../../../components/header';

function Harness() {
  const { isFullscreen, toggleFullscreen, triggerRef } = usePreviewFullscreen();
  const { setIsFullscreen } = useHeaderActions();

  return (
    <>
      <span data-testid='state'>{isFullscreen ? 'on' : 'off'}</span>
      <button ref={triggerRef} type='button' onClick={toggleFullscreen}>
        Toggle
      </button>
      <button type='button' onClick={() => setIsFullscreen(false)}>
        Exit
      </button>
    </>
  );
}

function renderHarness() {
  return render(
    <HeaderActionsProvider>
      <Harness />
    </HeaderActionsProvider>
  );
}

describe('usePreviewFullscreen', () => {
  afterEach(() => {
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  });

  it('locks the html element while open and restores it on exit', async () => {
    const user = userEvent.setup();
    renderHarness();

    await user.click(screen.getByRole('button', { name: 'Toggle' }));

    expect(screen.getByTestId('state')).toHaveTextContent('on');
    expect(document.documentElement.style.overflow).toBe('hidden');
    expect(document.body.style.overflow).toBe('');

    await user.click(screen.getByRole('button', { name: 'Exit' }));

    expect(screen.getByTestId('state')).toHaveTextContent('off');
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('leaves the mode on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    renderHarness();

    await user.click(screen.getByRole('button', { name: 'Toggle' }));
    screen.getByRole('button', { name: 'Exit' }).focus();
    await user.keyboard('{Escape}');

    expect(screen.getByTestId('state')).toHaveTextContent('off');
    expect(screen.getByRole('button', { name: 'Toggle' })).toHaveFocus();
  });
});
