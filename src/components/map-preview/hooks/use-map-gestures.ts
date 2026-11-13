import {
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { PointerSample } from '@readout';
import type { MapRenderer } from '@renderer';

import {
  movedBeyondTapTolerance,
  type PointerGestureKind,
  pointerGestureKind,
} from '../lib/pointer-gesture';

const WHEEL_ZOOM_SPEED = 0.0015;

interface MapReadoutPort {
  readonly sampleAt: (event: { clientX: number; clientY: number }) => PointerSample | undefined;
  readonly trackReadout: (event: { clientX: number; clientY: number }) => void;
  readonly togglePin: (position: PointerSample) => void;
  readonly clear: () => void;
}

interface MapMeasurementPort {
  readonly addPoint: (position: PointerSample) => void;
  readonly previewPoint: (position: PointerSample) => void;
  readonly finish: () => void;
  readonly clearPreview: () => void;
}

interface UseMapGesturesOptions {
  readonly rendererRef: RefObject<MapRenderer | null>;
  readonly canvasRef: RefObject<HTMLCanvasElement | null>;
  readonly zoomable: boolean;
  readonly measuring: boolean;
  readonly readout: MapReadoutPort;
  readonly measurement: MapMeasurementPort;
}

interface PointerGesture {
  readonly kind: PointerGestureKind;
  readonly pointerId: number;
  readonly button: number;
  readonly startX: number;
  readonly startY: number;
  lastX: number;
  lastY: number;
  moved: boolean;
}

export function useMapGestures({
  rendererRef,
  canvasRef,
  zoomable,
  measuring,
  readout,
  measurement,
}: UseMapGesturesOptions) {
  const gestureRef = useRef<PointerGesture | undefined>(undefined);
  const [panning, setPanning] = useState(false);
  const { sampleAt, trackReadout, togglePin, clear } = readout;
  const { addPoint, previewPoint, finish, clearPreview } = measurement;

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
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [canvasRef, rendererRef, zoomable]);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>): void => {
      if (gestureRef.current) {
        return;
      }
      const kind = pointerGestureKind(event, { zoomable, measuring });
      if (!kind) {
        return;
      }
      if (event.button === 1) {
        event.preventDefault();
      }
      event.currentTarget.setPointerCapture?.(event.pointerId);
      gestureRef.current = {
        kind,
        pointerId: event.pointerId,
        button: event.button,
        startX: event.clientX,
        startY: event.clientY,
        lastX: event.clientX,
        lastY: event.clientY,
        moved: false,
      };
      if (kind === 'measure') {
        const position = sampleAt(event);
        if (!position) {
          gestureRef.current = undefined;
          return;
        }
        addPoint(position);
        trackReadout(event);
        return;
      }
      trackReadout(event);
    },
    [addPoint, measuring, sampleAt, trackReadout, zoomable]
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>): void => {
      const gesture = gestureRef.current;
      if (gesture?.pointerId === event.pointerId) {
        const deltaX = event.clientX - gesture.lastX;
        const deltaY = event.clientY - gesture.lastY;
        if (!gesture.moved && movedBeyondTapTolerance(gesture.startX, gesture.startY, event)) {
          gesture.moved = true;
          if (gesture.kind === 'pan') {
            setPanning(true);
          }
        }
        if (gesture.moved && gesture.kind === 'pan') {
          gesture.lastX = event.clientX;
          gesture.lastY = event.clientY;
          rendererRef.current?.panByPixels(deltaX, deltaY);
          trackReadout(event);
          return;
        }
      }
      if (measuring && gesture?.kind !== 'pan') {
        const position = sampleAt(event);
        if (position) {
          previewPoint(position);
        }
      }
      trackReadout(event);
    },
    [measuring, previewPoint, rendererRef, sampleAt, trackReadout]
  );

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>): void => {
      const gesture = gestureRef.current;
      if (gesture?.pointerId !== event.pointerId) {
        return;
      }
      gestureRef.current = undefined;
      setPanning(false);
      if (gesture.kind === 'measure') {
        return;
      }
      if (gesture.moved || gesture.button === 1) {
        return;
      }
      const position = sampleAt(event);
      if (position) {
        togglePin(position);
      }
    },
    [sampleAt, togglePin]
  );

  const handlePointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>): void => {
      if (gestureRef.current?.kind === 'measure') {
        clearPreview();
      }
      gestureRef.current = undefined;
      setPanning(false);
      if (event.pointerType === 'touch') {
        return;
      }
      clear();
    },
    [clear, clearPreview]
  );

  const handleContextMenu = useCallback(
    (event: ReactMouseEvent<HTMLCanvasElement>): void => {
      if (!measuring) {
        return;
      }
      event.preventDefault();
      finish();
    },
    [finish, measuring]
  );

  const handlers = useMemo(
    () => ({
      onPointerMove: handlePointerMove,
      onPointerDown: handlePointerDown,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
      onContextMenu: handleContextMenu,
    }),
    [handleContextMenu, handlePointerCancel, handlePointerDown, handlePointerMove, handlePointerUp]
  );

  return { handlers, panning };
}
