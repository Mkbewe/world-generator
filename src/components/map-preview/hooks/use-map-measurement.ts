import { useCallback, useEffect, useState } from 'react';
import type { Measurement, PointerSample } from '@readout';

interface UseMapMeasurementOptions {
  readonly active: boolean;
}

export function useMapMeasurement({ active }: UseMapMeasurementOptions) {
  const [measurement, setMeasurement] = useState<Measurement | undefined>(undefined);

  const clear = useCallback((): void => {
    setMeasurement(undefined);
  }, []);

  const undo = useCallback((): void => {
    setMeasurement(current => {
      if (!current || current.points.length === 0) {
        return current;
      }
      const points = current.points.slice(0, -1);
      return points.length > 0 ? { points, finished: false } : undefined;
    });
  }, []);

  const addPoint = useCallback((position: PointerSample): void => {
    setMeasurement(current =>
      current && !current.finished
        ? { points: [...current.points, position], preview: position }
        : { points: [position], preview: position }
    );
  }, []);

  const previewPoint = useCallback((position: PointerSample): void => {
    setMeasurement(current => {
      if (!current || current.finished) {
        return current;
      }
      if (current.preview?.x === position.x && current.preview.y === position.y) {
        return current;
      }
      return { ...current, preview: position };
    });
  }, []);

  const finish = useCallback((): void => {
    setMeasurement(current => {
      if (!current) {
        return current;
      }
      if (current.finished) {
        return undefined;
      }
      const points = current.preview ? [...current.points, current.preview] : current.points;
      if (points.length < 2) {
        return undefined;
      }
      return { points, finished: true };
    });
  }, []);

  const clearPreview = useCallback((): void => {
    setMeasurement(current => (current ? { ...current, preview: undefined } : current));
  }, []);

  useEffect(() => {
    if (!active) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Backspace' && event.key !== 'Delete') {
        return;
      }
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      undo();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active, undo]);

  return { measurement, clear, undo, addPoint, previewPoint, finish, clearPreview };
}
