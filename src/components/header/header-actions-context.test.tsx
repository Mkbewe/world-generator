import { act, renderHook } from '@testing-library/react';

import { HeaderActionsProvider, useHeaderActions } from './header-actions-context';

describe('HeaderActionsProvider', () => {
  it('starts outside fullscreen', () => {
    const { result } = renderHook(() => useHeaderActions(), { wrapper: HeaderActionsProvider });

    expect(result.current.isFullscreen).toBe(false);
  });

  it('tracks the fullscreen flag', () => {
    const { result } = renderHook(() => useHeaderActions(), { wrapper: HeaderActionsProvider });

    act(() => result.current.setIsFullscreen(true));

    expect(result.current.isFullscreen).toBe(true);
  });

  it('rejects use without a provider', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      expect(() => renderHook(() => useHeaderActions())).toThrow(
        'useHeaderActions must be used within HeaderActionsProvider.'
      );
    } finally {
      error.mockRestore();
    }
  });
});
