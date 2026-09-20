import {
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import type { InspectorReadout, PointerSample } from '../../../utils/map-readout';
import type { MapRenderer, MapRendererState } from '../../../utils/map-renderer';

const TAP_MOVE_TOLERANCE_PX = 8;
const WHEEL_ZOOM_SPEED = 0.0015;

interface ReadoutOptions {
  /** Zoom and pan are part of the fullscreen mode; outside it the map stays fitted. */
  zoomable: boolean;
}

interface PointerGesture {
  pointerId: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  moved: boolean;
}

function isTouchPointer(event: { pointerType: string }): boolean {
  return event.pointerType === 'touch';
}

/** Pointer, wheel and touch gestures for the preview canvas, including the readout. */
export function useMapReadout(
  rendererRef: RefObject<MapRenderer | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  preview: MapRendererState,
  { zoomable }: ReadoutOptions
) {
  const positionRef = useRef<PointerSample | undefined>(undefined);
  const gestureRef = useRef<PointerGesture | undefined>(undefined);
  const [readout, setReadout] = useState<InspectorReadout | undefined>(undefined);
  const [pinned, setPinned] = useState(false);
  const [panning, setPanning] = useState(false);

  const refreshReadout = useCallback(
    (position: PointerSample): void => {
      setReadout({
        position,
        inspection: rendererRef.current?.inspect(position.x, position.y),
      });
    },
    [rendererRef]
  );

  const sampleAt = (event: { clientX: number; clientY: number }): PointerSample | undefined =>
    rendererRef.current?.samplePointer(event.clientX, event.clientY);

  useEffect(() => {
    if (pinned) {
      return;
    }
    const position = positionRef.current;
    if (position && rendererRef.current?.currentSize) {
      refreshReadout(position);
    }
  }, [pinned, preview.displayedLayer, refreshReadout, rendererRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !zoomable) {
      return;
    }
    const handleWheel = (event: WheelEvent): void => {
      event.preventDefault();
      const renderer = rendererRef.current;
      if (!renderer || !renderer.currentSize) {
        return;
      }
      renderer.zoomAtPointer(
        event.clientX,
        event.clientY,
        Math.exp(-event.deltaY * WHEEL_ZOOM_SPEED)
      );
    };
    // Native listener: the wheel handler needs `passive: false` to call preventDefault.
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [canvasRef, rendererRef, zoomable]);

  const trackReadout = (event: { clientX: number; clientY: number }): void => {
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
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>): void => {
    if (event.button !== 0 || gestureRef.current) {
      return;
    }
    // Keep move and up events on the canvas when a drag leaves its bounds.
    event.currentTarget.setPointerCapture?.(event.pointerId);
    gestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      moved: false,
    };
    trackReadout(event);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>): void => {
    const gesture = gestureRef.current;
    if (gesture?.pointerId === event.pointerId) {
      const deltaX = event.clientX - gesture.lastX;
      const deltaY = event.clientY - gesture.lastY;
      if (
        !gesture.moved &&
        Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) >
          TAP_MOVE_TOLERANCE_PX
      ) {
        gesture.moved = true;
        setPanning(zoomable);
      }
      if (gesture.moved) {
        gesture.lastX = event.clientX;
        gesture.lastY = event.clientY;
        if (zoomable) {
          rendererRef.current?.panByPixels(deltaX, deltaY);
        }
        trackReadout(event);
        return;
      }
    }
    trackReadout(event);
  };

  /** A tap toggles the pin; a drag pans the map. */
  const handlePointerUp = (event: ReactPointerEvent<HTMLCanvasElement>): void => {
    const gesture = gestureRef.current;
    if (gesture?.pointerId !== event.pointerId) {
      return;
    }
    gestureRef.current = undefined;
    setPanning(false);
    if (gesture.moved) {
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

  const handlePointerCancel = (event: ReactPointerEvent<HTMLCanvasElement>): void => {
    gestureRef.current = undefined;
    setPanning(false);
    if (isTouchPointer(event)) {
      return;
    }
    positionRef.current = undefined;
    setReadout(undefined);
  };

  /** Keeps the readout while the pointer moves onto the panels; clears it outside. */
  const handlePointerLeave = (event: ReactPointerEvent<HTMLElement>): void => {
    if (pinned || isTouchPointer(event)) {
      return;
    }
    positionRef.current = undefined;
    setReadout(undefined);
  };

  return {
    readout,
    pinned,
    panning,
    handlePointerLeave,
    handlers: {
      onPointerMove: handlePointerMove,
      onPointerDown: handlePointerDown,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
    },
  };
}
