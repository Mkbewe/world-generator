import { useCallback, useState } from 'react';

interface PreviewToolsOptions {
  readonly isFullscreen: boolean;
  readonly measuring: boolean;
  readonly setMeasuring: (measuring: boolean) => void;
  readonly clearMeasurement: () => void;
  readonly unpin: () => void;
}

/** Exclusive measuring and pinning modes of the preview tools. */
export function usePreviewTools({
  isFullscreen,
  measuring,
  setMeasuring,
  clearMeasurement,
  unpin,
}: PreviewToolsOptions) {
  const [pinning, setPinning] = useState(true);
  const pinningActive = isFullscreen ? pinning : true;

  const toggleMeasuring = useCallback((): void => {
    if (measuring) {
      clearMeasurement();
      setMeasuring(false);
      return;
    }
    unpin();
    setPinning(false);
    setMeasuring(true);
  }, [clearMeasurement, measuring, setMeasuring, unpin]);

  const togglePinning = useCallback((): void => {
    if (pinning) {
      unpin();
      setPinning(false);
      return;
    }
    clearMeasurement();
    setMeasuring(false);
    setPinning(true);
  }, [clearMeasurement, pinning, setMeasuring, unpin]);

  const reset = useCallback((): void => {
    setMeasuring(false);
    setPinning(true);
  }, [setMeasuring]);

  return { pinningActive, toggleMeasuring, togglePinning, reset };
}
