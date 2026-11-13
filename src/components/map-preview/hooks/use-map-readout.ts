import {
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { InspectorReadout, PointerSample } from '@readout';
import type { MapRenderer, MapRendererState } from '@renderer';

function isTouchPointer(event: { pointerType: string }): boolean {
  return event.pointerType === 'touch';
}

export function useMapReadout(
  rendererRef: RefObject<MapRenderer | null>,
  preview: MapRendererState
) {
  const positionRef = useRef<PointerSample | undefined>(undefined);
  const [readout, setReadout] = useState<InspectorReadout | undefined>(undefined);
  const [pinned, setPinned] = useState(false);

  const refreshReadout = useCallback(
    (position: PointerSample): void => {
      setReadout({
        position,
        inspection: rendererRef.current?.inspect(position.x, position.y),
        overlays: rendererRef.current?.inspectOverlays(position.x, position.y),
      });
    },
    [rendererRef]
  );

  const sampleAt = useCallback(
    (event: { clientX: number; clientY: number }): PointerSample | undefined =>
      rendererRef.current?.samplePointer(event.clientX, event.clientY),
    [rendererRef]
  );

  useEffect(() => {
    if (pinned) {
      return;
    }
    const position = positionRef.current;
    if (position && rendererRef.current?.currentSize) {
      refreshReadout(position);
    }
  }, [pinned, preview.displayedLayer, preview.overlays, refreshReadout, rendererRef]);

  const trackReadout = useCallback(
    (event: { clientX: number; clientY: number }): void => {
      if (pinned) {
        return;
      }
      const position = sampleAt(event);
      if (!position) {
        positionRef.current = undefined;
        setReadout(undefined);
        return;
      }
      const last = positionRef.current;
      if (last && last.x === position.x && last.y === position.y) {
        return;
      }
      positionRef.current = position;
      refreshReadout(position);
    },
    [pinned, refreshReadout, sampleAt]
  );

  const clear = useCallback((): void => {
    positionRef.current = undefined;
    setReadout(undefined);
  }, []);

  const togglePin = useCallback(
    (position: PointerSample): void => {
      positionRef.current = position;
      refreshReadout(position);
      setPinned(current => !current);
    },
    [refreshReadout]
  );

  const handlePointerLeave = useCallback(
    (event: ReactPointerEvent<HTMLElement>): void => {
      if (pinned || isTouchPointer(event)) {
        return;
      }
      clear();
    },
    [clear, pinned]
  );

  return { readout, pinned, sampleAt, trackReadout, togglePin, clear, handlePointerLeave };
}
