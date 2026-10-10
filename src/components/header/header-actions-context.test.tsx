import { act, renderHook } from '@testing-library/react';

import { HeaderActionsProvider, useHeaderActions } from './header-actions-context';

describe('HeaderActionsProvider', () => {
  it('starts without a fullscreen preview', () => {
    const { result } = renderHook(() => useHeaderActions(), { wrapper: HeaderActionsProvider });

    expect(result.current.canFullscreen).toBe(false);
    expect(result.current.isFullscreen).toBe(false);
  });

  it('tracks the fullscreen flag registered by the preview', () => {
    const { result } = renderHook(() => useHeaderActions(), { wrapper: HeaderActionsProvider });

    act(() => result.current.setCanFullscreen(true));
    act(() => result.current.setIsFullscreen(true));

    expect(result.current.canFullscreen).toBe(true);
    expect(result.current.isFullscreen).toBe(true);
  });

  it('keeps working without a provider', () => {
    const { result } = renderHook(() => useHeaderActions());

    expect(result.current.isFullscreen).toBe(false);
    expect(() => result.current.setIsFullscreen(true)).not.toThrow();
  });
});
