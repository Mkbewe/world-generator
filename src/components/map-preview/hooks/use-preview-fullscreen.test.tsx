import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { usePreviewFullscreen } from './use-preview-fullscreen';
import { HeaderActionsProvider, useHeaderActions } from '../../header';

function Harness() {
  const isFullscreen = usePreviewFullscreen();
  const { setIsFullscreen } = useHeaderActions();

  return (
    <>
      <span data-testid='state'>{isFullscreen ? 'on' : 'off'}</span>
      <button type='button' onClick={() => setIsFullscreen(true)}>
        Enter
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

    await user.click(screen.getByRole('button', { name: 'Enter' }));

    expect(screen.getByTestId('state')).toHaveTextContent('on');
    expect(document.documentElement.style.overflow).toBe('hidden');
    expect(document.body.style.overflow).toBe('');

    await user.click(screen.getByRole('button', { name: 'Exit' }));

    expect(screen.getByTestId('state')).toHaveTextContent('off');
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('leaves the mode on Escape', async () => {
    const user = userEvent.setup();
    renderHarness();

    await user.click(screen.getByRole('button', { name: 'Enter' }));
    await user.keyboard('{Escape}');

    expect(screen.getByTestId('state')).toHaveTextContent('off');
  });
});
