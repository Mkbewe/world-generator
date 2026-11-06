import { renderHook } from '@testing-library/react';

import { useEscapeKey } from './use-escape-key';

describe('useEscapeKey', () => {
  it('calls the handler on Escape while active', () => {
    const onEscape = vi.fn();
    renderHook(() => useEscapeKey(true, onEscape));

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('ignores Escape while inactive', () => {
    const onEscape = vi.fn();
    renderHook(() => useEscapeKey(false, onEscape));

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(onEscape).not.toHaveBeenCalled();
  });
});
