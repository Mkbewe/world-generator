import {
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  type InspectorReadout,
  type PointerSample,
  samplePointer,
} from '../../../utils/map-readout';
import type { MapRenderer, MapRendererState } from '../../../utils/map-renderer';

const TAP_MOVE_TOLERANCE_PX = 8;

interface TouchGesture {
  startX: number;
  startY: number;
  moved: boolean;
}

function isTouchPointer(event: { pointerType: string }): boolean {
  return event.pointerType === 'touch';
}

/** Pointer and touch readout for the preview canvas, including the pinned inspection. */
export function useMapReadout(
  rendererRef: RefObject<MapRenderer | null>,
  preview: MapRendererState
) {
  const positionRef = useRef<PointerSample | undefined>(undefined);
  const gestureRef = useRef<TouchGesture | undefined>(undefined);
  const [readout, setReadout] = useState<InspectorReadout | undefined>(undefined);
  const [pinned, setPinned] = useState(false);

  const refreshReadout = useCallback(
    (position: PointerSample): void => {
      setReadout({
        position,
        inspection: rendererRef.current?.inspect(position.x, position.y),
      });
    },
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
  }, [pinned, preview.displayedLayer, refreshReadout, rendererRef]);

  const sampleAt = (event: ReactPointerEvent<HTMLCanvasElement>): PointerSample | undefined => {
    const size = rendererRef.current?.currentSize;
    if (!size) {
      return undefined;
    }
    return samplePointer(
      event.currentTarget.getBoundingClientRect(),
      size,
      event.clientX,
      event.clientY
    );
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>): void => {
    const gesture = gestureRef.current;
    if (gesture && !gesture.moved) {
      const dx = event.clientX - gesture.startX;
      const dy = event.clientY - gesture.startY;
      if (Math.hypot(dx, dy) > TAP_MOVE_TOLERANCE_PX) {
        gesture.moved = true;
      }
    }
    if (pinned) {
      return;
    }
    const position = sampleAt(event);
    if (!position) {
      return;
    }
    const last = positionRef.current;
    if (last && last.x === position.x && last.y === position.y) {
      return;
    }
    positionRef.current = position;
    refreshReadout(position);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>): void => {
    if (event.button !== 0) {
      return;
    }
    if (isTouchPointer(event)) {
      gestureRef.current = { startX: event.clientX, startY: event.clientY, moved: false };
      if (pinned) {
        return;
      }
    }
    const position = sampleAt(event);
    if (!position) {
      return;
    }
    positionRef.current = position;
    refreshReadout(position);
    if (!isTouchPointer(event)) {
      setPinned(current => !current);
    }
  };

  /** A touch tap toggles the pin; a touch drag keeps following the finger. */
  const handlePointerUp = (event: ReactPointerEvent<HTMLCanvasElement>): void => {
    if (!isTouchPointer(event)) {
      return;
    }
    const gesture = gestureRef.current;
    gestureRef.current = undefined;
    if (!gesture || gesture.moved) {
      return;
    }
    const position = sampleAt(event);
    if (!position) {
      return;
    }
    positionRef.current = position;
    refreshReadout(position);
    setPinned(current => !current);
  };

  const clearReadout = (): void => {
    positionRef.current = undefined;
    setReadout(undefined);
  };

  /** Clears the readout only when the pointer leaves the whole preview, not just the canvas. */
  const handlePointerLeave = (event: ReactPointerEvent<HTMLElement>): void => {
    if (pinned || isTouchPointer(event)) {
      return;
    }
    clearReadout();
  };

  const handlePointerCancel = (event: ReactPointerEvent<HTMLCanvasElement>): void => {
    if (isTouchPointer(event)) {
      gestureRef.current = undefined;
      return;
    }
    clearReadout();
  };

  return {
    readout,
    pinned,
    handlePointerLeave,
    handlers: {
      onPointerMove: handlePointerMove,
      onPointerDown: handlePointerDown,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
    },
  };
}
