import { useState } from 'react';
import { act, renderHook } from '@testing-library/react';

import { usePreviewTools } from './use-preview-tools';

function renderTools(initialFullscreen = true) {
  const clearMeasurement = vi.fn();
  const unpin = vi.fn();
  const hook = renderHook(
    ({ isFullscreen }: { isFullscreen: boolean }) => {
      const [measuring, setMeasuring] = useState(false);
      return {
        ...usePreviewTools({
          isFullscreen,
          measuring,
          setMeasuring,
          clearMeasurement,
          unpin,
        }),
        measuring,
      };
    },
    { initialProps: { isFullscreen: initialFullscreen } }
  );
  return { ...hook, clearMeasurement, unpin };
}

describe('usePreviewTools', () => {
  it('switches between pinning and measuring', () => {
    const { result, clearMeasurement, unpin } = renderTools();

    expect(result.current.pinningActive).toBe(true);
    expect(result.current.measuring).toBe(false);

    act(() => result.current.toggleMeasuring());

    expect(result.current.measuring).toBe(true);
    expect(result.current.pinningActive).toBe(false);
    expect(unpin).toHaveBeenCalledOnce();

    act(() => result.current.toggleMeasuring());

    expect(result.current.measuring).toBe(false);
    expect(clearMeasurement).toHaveBeenCalledOnce();

    act(() => result.current.togglePinning());

    expect(result.current.pinningActive).toBe(true);
    expect(result.current.measuring).toBe(false);
    expect(clearMeasurement).toHaveBeenCalledTimes(2);

    act(() => result.current.togglePinning());

    expect(result.current.pinningActive).toBe(false);
    expect(unpin).toHaveBeenCalledTimes(2);
  });

  it('keeps pinning on in the preview and resets the tools for fullscreen', () => {
    const { result, rerender } = renderTools();

    act(() => result.current.togglePinning());
    expect(result.current.pinningActive).toBe(false);

    rerender({ isFullscreen: false });
    expect(result.current.pinningActive).toBe(true);

    act(() => result.current.reset());
    rerender({ isFullscreen: true });

    expect(result.current.pinningActive).toBe(true);
    expect(result.current.measuring).toBe(false);
  });
});
