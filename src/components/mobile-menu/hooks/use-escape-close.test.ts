import { renderHook } from '@testing-library/react';

import { useEscapeClose } from './use-escape-close';

describe('useEscapeClose', () => {
  it('calls onClose on Escape while active', () => {
    const onClose = vi.fn();
    renderHook(() => useEscapeClose(true, onClose));

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ignores Escape while inactive', () => {
    const onClose = vi.fn();
    renderHook(() => useEscapeClose(false, onClose));

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(onClose).not.toHaveBeenCalled();
  });
});
