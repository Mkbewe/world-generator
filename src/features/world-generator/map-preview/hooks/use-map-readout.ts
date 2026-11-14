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

import { MapReadoutStore } from '../lib/map-readout-store';

function isTouchPointer(event: { pointerType: string }): boolean {
  return event.pointerType === 'touch';
}

export function useMapReadout(
  rendererRef: RefObject<MapRenderer | null>,
  preview: MapRendererState
) {
  const positionRef = useRef<PointerSample | undefined>(undefined);
  const [store] = useState(() => new MapReadoutStore());

  const readoutAt = useCallback(
    (position: PointerSample): InspectorReadout => ({
      position,
      inspection: rendererRef.current?.inspect(position.x, position.y),
      overlays: rendererRef.current?.inspectOverlays(position.x, position.y),
    }),
    [rendererRef]
  );

  const refreshReadout = useCallback(
    (position: PointerSample): void => {
      store.setReadout(readoutAt(position));
    },
    [readoutAt, store]
  );

  const sampleAt = useCallback(
    (event: { clientX: number; clientY: number }): PointerSample | undefined =>
      rendererRef.current?.samplePointer(event.clientX, event.clientY),
    [rendererRef]
  );

  useEffect(() => {
    if (store.isPinned()) {
      return;
    }
    const position = positionRef.current;
    if (position && rendererRef.current?.currentSize) {
      refreshReadout(position);
    }
  }, [preview.displayedLayer, preview.overlays, refreshReadout, rendererRef, store]);

  const trackReadout = useCallback(
    (event: { clientX: number; clientY: number }): void => {
      if (store.isPinned()) {
        return;
      }
      const position = sampleAt(event);
      if (!position) {
        positionRef.current = undefined;
        store.clear();
        return;
      }
      const last = positionRef.current;
      if (last && last.x === position.x && last.y === position.y) {
        return;
      }
      positionRef.current = position;
      refreshReadout(position);
    },
    [refreshReadout, sampleAt, store]
  );

  const clear = useCallback((): void => {
    positionRef.current = undefined;
    store.clear();
  }, [store]);

  const togglePin = useCallback(
    (position: PointerSample): void => {
      positionRef.current = position;
      store.togglePinned(readoutAt(position));
    },
    [readoutAt, store]
  );

  const handlePointerLeave = useCallback(
    (event: ReactPointerEvent<HTMLElement>): void => {
      if (store.isPinned() || isTouchPointer(event)) {
        return;
      }
      clear();
    },
    [clear, store]
  );

  return { store, sampleAt, trackReadout, togglePin, clear, handlePointerLeave };
}
