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
  beforeEach(() => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
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

  it('stays open on a mobile viewport', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      media: '(width < 768px)',
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    } as unknown as MediaQueryList);
    renderHarness();

    await user.click(screen.getByRole('button', { name: 'Toggle' }));

    expect(screen.getByTestId('state')).toHaveTextContent('on');
  });

  it('opens at the top and restores the previous page scroll position', async () => {
    const user = userEvent.setup();
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 240 });
    renderHarness();

    await user.click(screen.getByRole('button', { name: 'Toggle' }));
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);

    await user.click(screen.getByRole('button', { name: 'Exit' }));
    expect(window.scrollTo).toHaveBeenCalledWith(0, 240);
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
